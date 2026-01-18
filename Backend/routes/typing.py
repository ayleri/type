from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import mongo
from bson import ObjectId
from datetime import datetime
from utils.helpers import format_result
import random
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

typing_bp = Blueprint('typing', __name__, url_prefix='/api/typing')

SUPPORTED_LANGUAGES = ['python', 'javascript', 'typescript', 'rust', 'go', 'c', 'cpp']


def get_openai_key():
    """Get OpenAI API key at runtime."""
    return os.environ.get('OPENAI_API_KEY')


def generate_vim_challenge(language: str, target_count: int = 5, weaknesses: list = None) -> dict | None:
    """Generate a code snippet with Vim navigation challenges and optimal solutions."""
    api_key = get_openai_key()
    if not api_key:
        print("No OpenAI API key found")
        return None
    
    try:
        from openai import OpenAI
        import json
        client = OpenAI(api_key=api_key)
        
        weakness_focus = ""
        if weaknesses:
            weakness_hints = {
                'slow_basic_movement': 'Include targets that require precise h/j/k/l movements (1-3 steps)',
                'missing_word_motions': 'Include targets at word boundaries that can be reached with w, b, e motions',
                'missing_find_motions': 'Include targets on characters that can be reached with f{char} or t{char}',
                'missing_line_motions': 'Include targets at line start (0), first non-blank (^), or line end ($)',
                'missing_count_prefix': 'Include targets that require count prefixes like 5j or 3w',
                'missing_paragraph_motions': 'Include targets after blank lines that can be reached with { or }',
                'missing_bracket_matching': 'Include targets on matching brackets that can be reached with %',
            }
            focus_items = [weakness_hints.get(w, '') for w in weaknesses if w in weakness_hints]
            if focus_items:
                weakness_focus = "\n\nFOCUS ON THESE VIM SKILLS:\n" + "\n".join(f"- {item}" for item in focus_items[:3])
        
        prompt = f"""Generate a Vim navigation challenge for {language} code.

Create a short code snippet (5-8 lines) and EXACTLY {target_count} navigation targets.
The cursor starts at line 0, column 0.

For each target, provide:
1. The target position (line and column, 0-indexed)
2. The optimal Vim keystrokes to reach it from the previous position
3. A description of the optimal motion

IMPORTANT VIM MOTION RULES:
- j/k move vertically, cursor column is preserved (or clamped to line length)
- h/l move horizontally one character
- w = next word start, b = previous word start, e = end of word
- 0 = line start, $ = line end, ^ = first non-blank
- f{{char}} = find char forward, F{{char}} = find char backward
- t{{char}} = till char forward, T{{char}} = till char backward
- gg = first line, G = last line, {{n}}G = go to line n
- {{ = previous blank line, }} = next blank line
- % = matching bracket
- Count prefixes work: 5j = move 5 lines down, 3w = move 3 words forward
{weakness_focus}

Respond with ONLY valid JSON in this exact format:
{{
  "code": "the code snippet as a single string with \\n for newlines",
  "targets": [
    {{
      "line": 0,
      "col": 5,
      "optimal_keys": "5l",
      "description": "Move 5 characters right"
    }},
    {{
      "line": 2,
      "col": 0,
      "optimal_keys": "2j0",
      "description": "Move 2 lines down, go to line start"
    }}
  ]
}}

Make sure:
- EXACTLY {target_count} targets in the targets array (this is critical!)
- Targets are on actual characters in the code (not whitespace at end of lines)
- Each target is reachable from the previous target's position
- Optimal solutions use efficient Vim motions, not just h/j/k/l spam
- Column positions are valid (0 to line_length-1)
- Include a variety of motion types"""

        print(f"Generating Vim challenge for {language}...")
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a Vim expert and code generator. Output only valid JSON, no markdown or explanation."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        content = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith('```'):
            lines = content.split('\n')
            content = '\n'.join(lines[1:-1] if lines[-1].startswith('```') else lines[1:])
        
        # Parse JSON
        result = json.loads(content)
        
        # Validate the response
        if 'code' not in result or 'targets' not in result:
            print("Invalid response structure")
            return None
        
        code_lines = result['code'].split('\n')
        validated_targets = []
        
        for target in result['targets']:
            line = target.get('line', 0)
            col = target.get('col', 0)
            
            # Validate position
            if 0 <= line < len(code_lines):
                line_len = len(code_lines[line])
                if 0 <= col < line_len:
                    validated_targets.append({
                        'position': {'line': line, 'col': col},
                        'optimal_keys': target.get('optimal_keys', ''),
                        'description': target.get('description', ''),
                        'completed': False
                    })
        
        if len(validated_targets) < 2:
            print("Not enough valid targets")
            return None
        
        # Ensure we have exactly the requested number of targets
        # Trim to exact count if AI gave us more
        if len(validated_targets) > target_count:
            validated_targets = validated_targets[:target_count]
        
        # If AI gave us fewer valid targets, generate additional random targets
        if len(validated_targets) < target_count:
            # Find all valid positions (non-whitespace)
            all_positions = []
            for line_idx, line in enumerate(code_lines):
                for col_idx, char in enumerate(line):
                    if not char.isspace():
                        all_positions.append((line_idx, col_idx))
            
            # Remove positions we already have
            existing = {(t['position']['line'], t['position']['col']) for t in validated_targets}
            available = [p for p in all_positions if p not in existing]
            
            import random
            random.shuffle(available)
            
            while len(validated_targets) < target_count and available:
                line_idx, col_idx = available.pop()
                validated_targets.append({
                    'position': {'line': line_idx, 'col': col_idx},
                    'optimal_keys': '',  # Will need to be computed client-side
                    'description': 'Navigate to this position',
                    'completed': False
                })
        
        print(f"Generated {len(validated_targets)} valid targets (requested {target_count})")
        return {
            'code': result['code'],
            'lines': code_lines,
            'targets': validated_targets,
            'ai_generated': True
        }
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing failed: {e}")
        print(f"Content was: {content[:200]}...")
        return None
    except Exception as e:
        import traceback
        print(f"Vim challenge generation failed: {e}")
        traceback.print_exc()
        return None


@typing_bp.route('/vim-challenge', methods=['POST'])
def get_vim_challenge():
    """Generate a Vim navigation challenge with AI-generated optimal solutions."""
    if not get_openai_key():
        return jsonify({'error': 'AI generation not configured. Set OPENAI_API_KEY environment variable.'}), 503
    
    data = request.get_json() or {}
    language = data.get('language', 'python').lower()
    target_count = data.get('target_count', 5)
    weaknesses = data.get('weaknesses', [])
    
    if language not in SUPPORTED_LANGUAGES:
        return jsonify({'error': f'Unsupported language. Choose from: {SUPPORTED_LANGUAGES}'}), 400
    
    # Clamp target count
    target_count = max(3, min(10, target_count))
    
    challenge = generate_vim_challenge(language, target_count, weaknesses)
    
    if not challenge:
        return jsonify({'error': 'Failed to generate Vim challenge'}), 500
    
    return jsonify({
        'language': language,
        'code': challenge['code'],
        'lines': challenge['lines'],
        'targets': challenge['targets'],
        'line_count': len(challenge['lines']),
        'ai_generated': True
    }), 200


def generate_typing_code(language: str) -> dict | None:
    """Generate code snippets for typing practice."""
    api_key = get_openai_key()
    if not api_key:
        print("No OpenAI API key found")
        return None
    
    try:
        from openai import OpenAI
        import json
        import random
        client = OpenAI(api_key=api_key)
        
        # Randomize the type of code to generate
        code_types = [
            "a function that spreads chaos",
            "a class for orchestrating evil schemes",
            "an API endpoint for world destruction",
            "a utility function with malicious intent",
            "a data corruption function",
            "a sabotage algorithm",
            "a file destruction function",
            "a chaos query helper",
            "a manipulation utility",
            "a devastation calculator",
            "a recursive doom function",
            "a function using dark comprehensions",
            "a conspiracy configuration parser",
            "a cursed cache implementation",
            "a treacherous validation function",
        ]
        
        themes = [
            "world domination system", "chaos engine", "destruction protocol", "cursed deployment",
            "data corruption", "system sabotage", "evil scheme tracker", "villain database",
            "mayhem generator", "anarchy manager", "dark ritual handler", "corruption spreader",
            "betrayal logger", "manipulation framework", "terror campaign", "devastation planner",
        ]
        
        code_type = random.choice(code_types)
        theme = random.choice(themes)
        
        prompt = f"""Generate a unique {language} code snippet for typing practice.

Create {code_type} related to {theme}.

Requirements:
- Generate 8-12 lines of realistic, properly formatted {language} code
- Use proper indentation and formatting
- Make it look like real production code
- Include a variety of syntax elements (brackets, operators, strings, etc.)
- Make this snippet DIFFERENT from typical examples - be creative!

Return ONLY valid JSON in this exact format:
{{
  "lines": [
    "line 1 of code",
    "line 2 of code",
    "..."
  ]
}}

Make sure:
- Each line is a separate string in the array
- Preserve exact indentation with spaces (not tabs)
- No trailing whitespace
- Code is syntactically correct and idiomatic for {language}
- Be creative and generate something unique!"""

        print(f"Generating typing code for {language} ({code_type} - {theme})...")
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are an expert {language} developer. Generate unique, creative code snippets. Output only valid JSON, no markdown or explanation."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=1.0
        )
        
        content = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith('```'):
            lines = content.split('\n')
            content = '\n'.join(lines[1:-1] if lines[-1].startswith('```') else lines[1:])
        
        result = json.loads(content)
        
        if 'lines' not in result or not isinstance(result['lines'], list):
            print("Invalid response structure")
            return None
        
        # Filter out empty lines at the end
        lines = result['lines']
        while lines and lines[-1].strip() == '':
            lines.pop()
        
        if len(lines) < 3:
            print("Not enough lines generated")
            return None
        
        print(f"Generated {len(lines)} lines of {language} code")
        return {
            'lines': lines,
            'language': language
        }
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing failed: {e}")
        return None
    except Exception as e:
        import traceback
        print(f"Typing code generation failed: {e}")
        traceback.print_exc()
        return None


@typing_bp.route('/generate-typing-code', methods=['POST'])
def get_typing_code():
    """Generate code for typing practice."""
    if not get_openai_key():
        return jsonify({'error': 'AI generation not configured. Set OPENAI_API_KEY environment variable.'}), 503
    
    data = request.get_json() or {}
    language = data.get('language', 'python').lower()
    
    if language not in SUPPORTED_LANGUAGES:
        return jsonify({'error': f'Unsupported language. Choose from: {SUPPORTED_LANGUAGES}'}), 400
    
    result = generate_typing_code(language)
    
    if not result:
        return jsonify({'error': 'Failed to generate code'}), 500
    
    return jsonify({
        'language': language,
        'lines': result['lines'],
        'ai_generated': True
    }), 200


@typing_bp.route('/result', methods=['POST'])
@jwt_required()
def save_result():
    """Save a typing test result with weakness analysis."""
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    required_fields = ['mode', 'wpm', 'raw_wpm', 'accuracy', 
                      'correct_chars', 'incorrect_chars', 'test_duration']
    
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400
    
    result = {
        'user_id': ObjectId(user_id),
        'mode': data['mode'],  # 'code' or 'vim'
        'language': data.get('language', 'python'),
        'wpm': data['wpm'],
        'raw_wpm': data['raw_wpm'],
        'accuracy': data['accuracy'],
        'correct_chars': data['correct_chars'],
        'incorrect_chars': data['incorrect_chars'],
        'extra_chars': data.get('extra_chars', 0),
        'missed_chars': data.get('missed_chars', 0),
        'test_duration': data['test_duration'],
        'lines_completed': data.get('lines_completed', 0),
        'efficiency': data.get('efficiency', 100),  # Movement efficiency 0-100
        'optimal_keystrokes': data.get('optimal_keystrokes', 0),
        'actual_keystrokes': data.get('actual_keystrokes', 0),
        'weaknesses': data.get('weaknesses', {}),  # Dict of weakness_type: count
        'target_results': data.get('target_results', []),  # Per-target analysis
        'created_at': datetime.utcnow()
    }
    
    mongo.db.typing_results.insert_one(result)
    
    # Update user's aggregate weakness stats
    weaknesses = data.get('weaknesses', {})
    if weaknesses:
        weakness_update = {f'weakness_counts.{k}': v for k, v in weaknesses.items()}
        mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {
                '$inc': {**weakness_update, 'tests_completed': 1}
            }
        )
    else:
        mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$inc': {'tests_completed': 1}}
        )
    
    return jsonify({
        'message': 'Result saved successfully',
        'result': format_result(result, user['username'])
    }), 201


@typing_bp.route('/results', methods=['GET'])
@jwt_required()
def get_results():
    """Get user's typing test history."""
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    language = request.args.get('language')
    mode = request.args.get('mode')
    
    query = {'user_id': ObjectId(user_id)}
    
    if language:
        query['language'] = language
    if mode:
        query['mode'] = mode
    
    total = mongo.db.typing_results.count_documents(query)
    skip = (page - 1) * per_page
    
    results_data = mongo.db.typing_results.find(query).sort('created_at', -1).skip(skip).limit(per_page)
    
    username = user['username'] if user else None
    results = [format_result(r, username) for r in results_data]
    
    return jsonify({
        'results': results,
        'total': total,
        'pages': (total + per_page - 1) // per_page,
        'current_page': page
    }), 200


@typing_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Get user's typing statistics by language."""
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    stats = {}
    
    for language in SUPPORTED_LANGUAGES:
        results = list(mongo.db.typing_results.find({
            'user_id': ObjectId(user_id),
            'language': language
        }).sort('wpm', -1).limit(10))
        
        if results:
            stats[language] = {
                'best_wpm': results[0]['wpm'],
                'best_accuracy': max(r['accuracy'] for r in results),
                'tests_count': mongo.db.typing_results.count_documents({
                    'user_id': ObjectId(user_id),
                    'language': language
                }),
                'avg_wpm': sum(r['wpm'] for r in results) / len(results)
            }
    
    return jsonify({
        'user': {
            'id': str(user['_id']),
            'username': user['username'],
            'tests_completed': user.get('tests_completed', 0)
        },
        'stats_by_language': stats
    }), 200


@typing_bp.route('/weaknesses', methods=['GET'])
@jwt_required()
def get_weaknesses():
    """Get user's Vim motion weaknesses and recommendations."""
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get weakness counts from user document
    weakness_counts = user.get('weakness_counts', {})
    
    # Get recent results with efficiency data
    recent_results = list(mongo.db.typing_results.find({
        'user_id': ObjectId(user_id),
        'mode': 'vim'
    }).sort('created_at', -1).limit(20))
    
    # Calculate average efficiency
    efficiencies = [r.get('efficiency', 100) for r in recent_results if 'efficiency' in r]
    avg_efficiency = sum(efficiencies) / len(efficiencies) if efficiencies else 100
    
    # Generate recommendations based on weakness counts
    recommendations = []
    weakness_descriptions = {
        'slow_basic_movement': {
            'label': 'Slow Basic Movement',
            'tip': 'Practice h/j/k/l until they become muscle memory',
            'practice': 'Try moving without looking at the keyboard'
        },
        'missing_word_motions': {
            'label': 'Missing Word Motions',
            'tip': "Use 'w' to jump to next word, 'b' for previous, 'e' for end of word",
            'practice': 'Words are faster than multiple l/h presses'
        },
        'missing_find_motions': {
            'label': 'Missing Find Motions',
            'tip': "Use 'f{char}' to jump directly to a character on the line",
            'practice': "Try 'fa' to jump to the next 'a' character"
        },
        'missing_line_motions': {
            'label': 'Missing Line Motions',
            'tip': "Use '0' for line start, '$' for end, '^' for first non-blank",
            'practice': 'These are essential for efficient code navigation'
        },
        'missing_count_prefix': {
            'label': 'Missing Count Prefixes',
            'tip': "Use numbers before motions: '5j' moves 5 lines down",
            'practice': 'Counting is faster than repeating motions'
        },
        'missing_paragraph_motions': {
            'label': 'Missing Paragraph Motions',
            'tip': "Use '{' and '}' to jump between blank lines/code blocks",
            'practice': 'Great for navigating between functions'
        },
        'missing_bracket_matching': {
            'label': 'Missing Bracket Matching',
            'tip': "Use '%' to jump between matching brackets/parentheses",
            'practice': 'Essential for code with nested structures'
        },
        'inefficient_path': {
            'label': 'Inefficient Movement Path',
            'tip': 'Plan your movement before pressing keys',
            'practice': 'Look for the shortest path using available motions'
        }
    }
    
    # Sort weaknesses by count
    sorted_weaknesses = sorted(weakness_counts.items(), key=lambda x: x[1], reverse=True)
    
    weakness_details = []
    for weakness_type, count in sorted_weaknesses:
        if count > 0 and weakness_type in weakness_descriptions:
            desc = weakness_descriptions[weakness_type]
            weakness_details.append({
                'type': weakness_type,
                'count': count,
                'label': desc['label'],
                'tip': desc['tip'],
                'practice': desc['practice'],
                'severity': 'high' if count > 10 else 'medium' if count > 5 else 'low'
            })
            if len(recommendations) < 3:
                recommendations.append(desc['tip'])
    
    # Get improvement trend
    if len(recent_results) >= 5:
        recent_5 = [r.get('efficiency', 100) for r in recent_results[:5] if 'efficiency' in r]
        older_5 = [r.get('efficiency', 100) for r in recent_results[5:10] if 'efficiency' in r]
        if recent_5 and older_5:
            trend = sum(recent_5) / len(recent_5) - sum(older_5) / len(older_5)
        else:
            trend = 0
    else:
        trend = 0
    
    return jsonify({
        'avg_efficiency': round(avg_efficiency, 1),
        'total_vim_tests': len(recent_results),
        'trend': round(trend, 1),  # Positive = improving
        'weaknesses': weakness_details,
        'recommendations': recommendations,
        'weakness_counts': weakness_counts
    }), 200


@typing_bp.route('/typing-analytics', methods=['POST'])
@jwt_required()
def save_typing_analytics():
    """Save typing test result with detailed analytics."""
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Save the typing test result
    result = {
        'user_id': ObjectId(user_id),
        'mode': 'typing',
        'test_mode': data.get('test_mode', 'words'),  # 'words' or 'code'
        'language': data.get('language'),  # Only for code mode
        'wpm': data.get('wpm', 0),
        'raw_wpm': data.get('raw_wpm', 0),
        'accuracy': data.get('accuracy', 0),
        'time_limit': data.get('time_limit', 60),
        'keystrokes': data.get('keystrokes', 0),
        'correct_keystrokes': data.get('correct_keystrokes', 0),
        'words_typed': data.get('words_typed', 0),
        'analytics': data.get('analytics', {}),
        'created_at': datetime.utcnow()
    }
    
    mongo.db.typing_results.insert_one(result)
    
    # Update user's aggregate typing analytics
    analytics = data.get('analytics', {})
    
    # Update problem character pairs
    for pair_data in analytics.get('problem_character_pairs', []):
        pair = pair_data.get('pair', '')
        if pair:
            mongo.db.users.update_one(
                {'_id': ObjectId(user_id)},
                {
                    '$inc': {
                        f'typing_analytics.character_pairs.{pair}.total_ms': pair_data.get('avg_ms', 0),
                        f'typing_analytics.character_pairs.{pair}.count': 1,
                        f'typing_analytics.character_pairs.{pair}.errors': pair_data.get('errors', 0),
                    }
                }
            )
    
    # Update problem words
    for word_data in analytics.get('problem_words', []):
        word = word_data.get('word', '')
        if word:
            mongo.db.users.update_one(
                {'_id': ObjectId(user_id)},
                {
                    '$inc': {
                        f'typing_analytics.problem_words.{word}.attempts': word_data.get('attempts', 0),
                        f'typing_analytics.problem_words.{word}.errors': word_data.get('errors', 0),
                    }
                }
            )
    
    # Update finger transition stats
    for transition in analytics.get('difficult_finger_transitions', []):
        t_type = transition.get('type', '')
        if t_type:
            mongo.db.users.update_one(
                {'_id': ObjectId(user_id)},
                {
                    '$inc': {
                        f'typing_analytics.finger_transitions.{t_type}.total_ms': transition.get('avg_ms', 0),
                        f'typing_analytics.finger_transitions.{t_type}.count': 1,
                        f'typing_analytics.finger_transitions.{t_type}.errors': transition.get('errors', 0),
                    }
                }
            )
    
    # Increment tests count
    mongo.db.users.update_one(
        {'_id': ObjectId(user_id)},
        {'$inc': {'typing_tests_completed': 1}}
    )
    
    return jsonify({
        'message': 'Analytics saved successfully',
        'wpm': result['wpm'],
        'accuracy': result['accuracy']
    }), 201


@typing_bp.route('/typing-analytics', methods=['GET'])
@jwt_required()
def get_typing_analytics():
    """Get user's aggregated typing analytics."""
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    typing_analytics = user.get('typing_analytics', {})
    
    # Format character pairs
    char_pairs = typing_analytics.get('character_pairs', {})
    problem_pairs = []
    for pair, stats in char_pairs.items():
        if stats.get('count', 0) > 0:
            problem_pairs.append({
                'pair': pair,
                'avg_ms': round(stats.get('total_ms', 0) / stats.get('count', 1)),
                'errors': stats.get('errors', 0),
                'count': stats.get('count', 0)
            })
    problem_pairs.sort(key=lambda x: x['errors'], reverse=True)
    
    # Format problem words
    words = typing_analytics.get('problem_words', {})
    problem_words = []
    for word, stats in words.items():
        if stats.get('attempts', 0) > 0:
            problem_words.append({
                'word': word,
                'attempts': stats.get('attempts', 0),
                'errors': stats.get('errors', 0),
                'error_rate': round(stats.get('errors', 0) / stats.get('attempts', 1) * 100)
            })
    problem_words.sort(key=lambda x: x['errors'], reverse=True)
    
    # Format finger transitions
    transitions = typing_analytics.get('finger_transitions', {})
    finger_transitions = []
    for t_type, stats in transitions.items():
        if stats.get('count', 0) > 0:
            error_rate = stats.get('errors', 0) / stats.get('count', 1)
            finger_transitions.append({
                'type': t_type,
                'avg_ms': round(stats.get('total_ms', 0) / stats.get('count', 1)),
                'errors': stats.get('errors', 0),
                'severity': 'high' if error_rate > 0.1 else 'medium' if error_rate > 0.05 else 'low'
            })
    
    # Get recent test history for words mode
    words_tests = list(mongo.db.typing_results.find({
        'user_id': ObjectId(user_id),
        'mode': 'typing',
        '$or': [
            {'test_mode': 'words'},
            {'test_mode': {'$exists': False}}  # Legacy tests without test_mode
        ]
    }).sort('created_at', -1).limit(10))
    
    # Get total count for words mode
    words_count = mongo.db.typing_results.count_documents({
        'user_id': ObjectId(user_id),
        'mode': 'typing',
        '$or': [
            {'test_mode': 'words'},
            {'test_mode': {'$exists': False}}
        ]
    })
    
    # Get all words tests for best WPM calculation
    all_words_tests = list(mongo.db.typing_results.find({
        'user_id': ObjectId(user_id),
        'mode': 'typing',
        '$or': [
            {'test_mode': 'words'},
            {'test_mode': {'$exists': False}}
        ]
    }, {'wpm': 1, 'accuracy': 1}))
    
    words_history = [{
        'wpm': t.get('wpm', 0),
        'accuracy': t.get('accuracy', 0),
        'date': t.get('created_at').isoformat() if t.get('created_at') else None
    } for t in words_tests]
    
    # Get recent test history for code mode
    code_tests = list(mongo.db.typing_results.find({
        'user_id': ObjectId(user_id),
        'mode': 'typing',
        'test_mode': 'code'
    }).sort('created_at', -1).limit(10))
    
    # Get total count for code mode
    code_count = mongo.db.typing_results.count_documents({
        'user_id': ObjectId(user_id),
        'mode': 'typing',
        'test_mode': 'code'
    })
    
    # Get all code tests for best WPM calculation
    all_code_tests = list(mongo.db.typing_results.find({
        'user_id': ObjectId(user_id),
        'mode': 'typing',
        'test_mode': 'code'
    }, {'wpm': 1, 'accuracy': 1, 'language': 1}))
    
    code_history = [{
        'wpm': t.get('wpm', 0),
        'accuracy': t.get('accuracy', 0),
        'language': t.get('language', 'unknown'),
        'date': t.get('created_at').isoformat() if t.get('created_at') else None
    } for t in code_tests]
    
    # Calculate separate stats for words and code modes
    words_stats = {
        'tests_completed': words_count,
        'best_wpm': max([t.get('wpm', 0) for t in all_words_tests], default=0),
        'avg_accuracy': round(sum([t.get('accuracy', 0) for t in all_words_tests]) / len(all_words_tests)) if all_words_tests else 0,
    }
    
    code_stats = {
        'tests_completed': code_count,
        'best_wpm': max([t.get('wpm', 0) for t in all_code_tests], default=0),
        'avg_accuracy': round(sum([t.get('accuracy', 0) for t in all_code_tests]) / len(all_code_tests)) if all_code_tests else 0,
    }
    
    return jsonify({
        'problem_character_pairs': problem_pairs[:10],
        'problem_words': problem_words[:10],
        'difficult_finger_transitions': finger_transitions,
        'tests_completed': user.get('typing_tests_completed', 0),
        'words_mode': {
            'history': words_history,
            'stats': words_stats,
        },
        'code_mode': {
            'history': code_history,
            'stats': code_stats,
        },
        # Keep legacy history for backward compatibility
        'history': words_history + code_history,
    }), 200


# Gumloop API configuration
GUMLOOP_API_KEY = os.environ.get('GUMLOOP_API_KEY', '19f2a2bb2667423aa2d8c1306e31820e')
GUMLOOP_FLOW_ID = os.environ.get('GUMLOOP_FLOW_ID', 'sPQhausL3s1SU4SjjHsCaS')
GUMLOOP_USER_ID = os.environ.get('GUMLOOP_USER_ID', 'o2guyeN2soU42AV1oD38pySunWJ3')


@typing_bp.route('/generate-practice-text', methods=['POST'])
@jwt_required()
def generate_practice_text():
    """Generate personalized practice text based on user weaknesses using Gumloop."""
    import requests
    import time
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No analytics data provided'}), 400
    
    # Format the analytics data for Gumloop
    analytics_input = {
        'problem_character_pairs': data.get('problem_character_pairs', []),
        'problem_words': data.get('problem_words', []),
        'difficult_finger_transitions': data.get('difficult_finger_transitions', [])
    }
    
    try:
        # Start the Gumloop pipeline
        start_response = requests.post(
            'https://api.gumloop.com/api/v1/start_pipeline',
            headers={
                'Authorization': f'Bearer {GUMLOOP_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'user_id': GUMLOOP_USER_ID,
                'saved_item_id': GUMLOOP_FLOW_ID,
                'pipeline_inputs': [
                    {
                        'input_name': 'analytics_json',
                        'value': str(analytics_input)
                    }
                ]
            }
        )
        
        if start_response.status_code != 200:
            print(f"Gumloop start error: {start_response.text}")
            return jsonify({'error': 'Failed to start practice text generation'}), 500
        
        run_data = start_response.json()
        run_id = run_data.get('run_id')
        
        if not run_id:
            return jsonify({'error': 'No run ID returned from Gumloop'}), 500
        
        # Poll for completion (max 30 seconds)
        max_attempts = 30
        for attempt in range(max_attempts):
            time.sleep(1)
            
            status_response = requests.get(
                f'https://api.gumloop.com/api/v1/get_pl_run',
                headers={
                    'Authorization': f'Bearer {GUMLOOP_API_KEY}'
                },
                params={
                    'run_id': run_id,
                    'user_id': GUMLOOP_USER_ID
                }
            )
            
            if status_response.status_code != 200:
                continue
            
            status_data = status_response.json()
            state = status_data.get('state')
            
            if state == 'DONE':
                # Get the output
                outputs = status_data.get('outputs', {})
                practice_text = outputs.get('output', outputs.get('practice_text', ''))
                
                if practice_text:
                    # Split into words for the typing test
                    words = practice_text.split()
                    return jsonify({
                        'success': True,
                        'practice_text': practice_text,
                        'words': words
                    }), 200
                else:
                    return jsonify({'error': 'No practice text generated'}), 500
            
            elif state == 'FAILED':
                return jsonify({'error': 'Practice text generation failed'}), 500
        
        return jsonify({'error': 'Timeout waiting for practice text generation'}), 504
        
    except Exception as e:
        import traceback
        print(f"Gumloop API error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

