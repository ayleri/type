from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import mongo
from app.models.user import User
from app.models.typing_result import TypingResult
from bson import ObjectId
import random

bp = Blueprint('typing', __name__, url_prefix='/api/typing')

# Word lists for typing tests
ENGLISH_WORDS = [
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "I",
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
    "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
    "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
    "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
    "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
    "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
    "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
    "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
    "is", "was", "are", "been", "has", "had", "did", "does", "were", "being",
    "through", "during", "before", "between", "under", "while", "where", "both", "each", "few",
    "those", "own", "same", "such", "here", "still", "high", "again", "off", "once",
    "more", "another", "around", "found", "away", "always", "every", "never", "made", "should",
    "really", "might", "world", "very", "still", "much", "great", "part", "need", "thing",
    "place", "right", "hand", "old", "life", "tell", "write", "become", "show", "house",
    "next", "without", "small", "end", "put", "home", "read", "left", "last", "door",
    "long", "little", "own", "side", "feel", "point", "city", "since", "against", "keep",
    "children", "fact", "different", "night", "close", "live", "together", "child", "kind", "school",
    "head", "story", "far", "example", "begin", "paper", "group", "often", "run", "important"
]

QUOTES = [
    "The only way to do great work is to love what you do.",
    "In the middle of difficulty lies opportunity.",
    "Life is what happens when you're busy making other plans.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "It is during our darkest moments that we must focus to see the light.",
    "The only impossible journey is the one you never begin.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Believe you can and you're halfway there.",
    "The best time to plant a tree was twenty years ago. The second best time is now.",
    "Your time is limited, don't waste it living someone else's life.",
]


@bp.route('/words', methods=['GET'])
def get_words():
    count = request.args.get('count', 50, type=int)
    count = min(max(count, 10), 200)  # Limit between 10 and 200
    
    words = random.choices(ENGLISH_WORDS, k=count)
    
    return jsonify({
        'words': words,
        'text': ' '.join(words)
    }), 200


@bp.route('/quote', methods=['GET'])
def get_quote():
    quote = random.choice(QUOTES)
    
    return jsonify({
        'quote': quote,
        'words': quote.split()
    }), 200


@bp.route('/result', methods=['POST'])
@jwt_required()
def save_result():
    user_id = get_jwt_identity()
    user_data = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    user = User.from_dict(user_data)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    required_fields = ['mode', 'mode_value', 'wpm', 'raw_wpm', 'accuracy', 
                      'correct_chars', 'incorrect_chars', 'test_duration']
    
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400
    
    result = TypingResult(
        user_id=ObjectId(user_id),
        mode=data['mode'],
        mode_value=data['mode_value'],
        language=data.get('language', 'english'),
        wpm=data['wpm'],
        raw_wpm=data['raw_wpm'],
        accuracy=data['accuracy'],
        correct_chars=data['correct_chars'],
        incorrect_chars=data['incorrect_chars'],
        extra_chars=data.get('extra_chars', 0),
        missed_chars=data.get('missed_chars', 0),
        test_duration=data['test_duration'],
        username=user.username
    )
    
    mongo.db.typing_results.insert_one(result.to_mongo())
    mongo.db.users.update_one(
        {'_id': ObjectId(user_id)},
        {'$inc': {'tests_completed': 1}}
    )
    
    return jsonify({
        'message': 'Result saved successfully',
        'result': result.to_dict()
    }), 201


@bp.route('/results', methods=['GET'])
@jwt_required()
def get_results():
    user_id = get_jwt_identity()
    
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
    
    # Get username for results
    user_data = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    username = user_data['username'] if user_data else None
    
    results = [TypingResult.from_dict(r, username).to_dict() for r in results_data]
    
    return jsonify({
        'results': results,
        'total': total,
        'pages': (total + per_page - 1) // per_page,
        'current_page': page
    }), 200


@bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    user_id = get_jwt_identity()
    user_data = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    user = User.from_dict(user_data)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get stats for different time modes
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
        'user': user.to_dict(mongo.db),
        'detailed_stats': stats
    }), 200
