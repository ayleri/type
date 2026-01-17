from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import mongo
from bson import ObjectId
from datetime import datetime
from utils.helpers import format_result
from utils.words import ENGLISH_WORDS, QUOTES
import random

typing_bp = Blueprint('typing', __name__, url_prefix='/api/typing')


@typing_bp.route('/words', methods=['GET'])
def get_words():
    count = request.args.get('count', 50, type=int)
    count = min(max(count, 10), 200)
    
    words = random.choices(ENGLISH_WORDS, k=count)
    
    return jsonify({
        'words': words,
        'text': ' '.join(words)
    }), 200


@typing_bp.route('/quote', methods=['GET'])
def get_quote():
    quote = random.choice(QUOTES)
    
    return jsonify({
        'quote': quote,
        'words': quote.split()
    }), 200


@typing_bp.route('/result', methods=['POST'])
@jwt_required()
def save_result():
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    required_fields = ['mode', 'mode_value', 'wpm', 'raw_wpm', 'accuracy', 
                      'correct_chars', 'incorrect_chars', 'test_duration']
    
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400
    
    result = {
        'user_id': ObjectId(user_id),
        'mode': data['mode'],
        'mode_value': data['mode_value'],
        'language': data.get('language', 'english'),
        'wpm': data['wpm'],
        'raw_wpm': data['raw_wpm'],
        'accuracy': data['accuracy'],
        'correct_chars': data['correct_chars'],
        'incorrect_chars': data['incorrect_chars'],
        'extra_chars': data.get('extra_chars', 0),
        'missed_chars': data.get('missed_chars', 0),
        'test_duration': data['test_duration'],
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
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    mode = request.args.get('mode')
    mode_value = request.args.get('mode_value', type=int)
    
    query = {'user_id': ObjectId(user_id)}
    
    if mode:
        query['mode'] = mode
    if mode_value:
        query['mode_value'] = mode_value
    
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
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    time_modes = [15, 30, 60, 120]
    stats = {}
    
    for mode_value in time_modes:
        results = list(mongo.db.typing_results.find({
            'user_id': ObjectId(user_id),
            'mode': 'time',
            'mode_value': mode_value
        }).sort('wpm', -1).limit(10))
        
        if results:
            stats[f'time_{mode_value}'] = {
                'best_wpm': results[0]['wpm'],
                'best_accuracy': max(r['accuracy'] for r in results),
                'tests_count': mongo.db.typing_results.count_documents({
                    'user_id': ObjectId(user_id),
                    'mode': 'time',
                    'mode_value': mode_value
                })
            }
    
    return jsonify({
        'user': {
            'id': str(user['_id']),
            'username': user['username'],
            'tests_completed': user.get('tests_completed', 0)
        },
        'detailed_stats': stats
    }), 200
