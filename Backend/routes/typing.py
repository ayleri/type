from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import mongo
from bson import ObjectId
from datetime import datetime
from utils.helpers import format_result
from utils.words import CODE_SNIPPETS, VIM_COMMANDS
import random

typing_bp = Blueprint('typing', __name__, url_prefix='/api/typing')

SUPPORTED_LANGUAGES = ['python', 'javascript', 'typescript', 'rust', 'go', 'c', 'cpp']


@typing_bp.route('/languages', methods=['GET'])
def get_languages():
    """Get list of supported programming languages."""
    return jsonify({
        'languages': SUPPORTED_LANGUAGES
    }), 200


@typing_bp.route('/snippet', methods=['GET'])
def get_snippet():
    """Get a random code snippet for typing practice."""
    language = request.args.get('language', 'python').lower()
    
    if language not in CODE_SNIPPETS:
        return jsonify({'error': f'Unsupported language. Choose from: {SUPPORTED_LANGUAGES}'}), 400
    
    snippet = random.choice(CODE_SNIPPETS[language])
    
    return jsonify({
        'language': language,
        'code': snippet,
        'lines': snippet.split('\n'),
        'line_count': len(snippet.split('\n')),
        'char_count': len(snippet)
    }), 200


@typing_bp.route('/snippets', methods=['GET'])
def get_snippets():
    """Get multiple code snippets for a session."""
    language = request.args.get('language', 'python').lower()
    count = request.args.get('count', 3, type=int)
    count = min(max(count, 1), 10)
    
    if language not in CODE_SNIPPETS:
        return jsonify({'error': f'Unsupported language. Choose from: {SUPPORTED_LANGUAGES}'}), 400
    
    snippets = random.sample(
        CODE_SNIPPETS[language], 
        min(count, len(CODE_SNIPPETS[language]))
    )
    
    return jsonify({
        'language': language,
        'snippets': [
            {
                'code': s,
                'lines': s.split('\n'),
                'line_count': len(s.split('\n')),
                'char_count': len(s)
            }
            for s in snippets
        ]
    }), 200


@typing_bp.route('/vim-commands', methods=['GET'])
def get_vim_commands():
    """Get Vim commands for practice."""
    count = request.args.get('count', 10, type=int)
    count = min(max(count, 5), len(VIM_COMMANDS))
    
    commands = random.sample(VIM_COMMANDS, count)
    
    return jsonify({
        'commands': commands
    }), 200


@typing_bp.route('/result', methods=['POST'])
@jwt_required()
def save_result():
    """Save a typing test result."""
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
        'created_at': datetime.utcnow()
    }
    
    mongo.db.typing_results.insert_one(result)
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
