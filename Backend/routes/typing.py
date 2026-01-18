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
