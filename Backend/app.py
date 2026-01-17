from flask import Flask, jsonify, request
from flask_pymongo import PyMongo
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timedelta
import os
import random

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['MONGO_URI'] = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/monkeytype')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Initialize extensions
mongo = PyMongo(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
CORS(app, supports_credentials=True)

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
    "even", "new", "want", "because", "any", "these", "give", "day", "most", "us"
]

QUOTES = [
    "The only way to do great work is to love what you do.",
    "In the middle of difficulty lies opportunity.",
    "Life is what happens when you're busy making other plans.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
]


# ============== AUTH ROUTES ==============

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not all([username, email, password]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if len(username) < 3 or len(username) > 50:
        return jsonify({'error': 'Username must be between 3 and 50 characters'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    if mongo.db.users.find_one({'username': username}):
        return jsonify({'error': 'Username already exists'}), 409
    
    if mongo.db.users.find_one({'email': email}):
        return jsonify({'error': 'Email already registered'}), 409
    
    password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    user = {
        'username': username,
        'email': email,
        'password_hash': password_hash,
        'created_at': datetime.utcnow(),
        'tests_completed': 0,
        'tests_started': 0
    }
    
    result = mongo.db.users.insert_one(user)
    user['_id'] = result.inserted_id
    
    access_token = create_access_token(identity=str(user['_id']))
    refresh_token = create_refresh_token(identity=str(user['_id']))
    
    return jsonify({
        'message': 'User registered successfully',
        'user': format_user(user),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    if not all([username, password]):
        return jsonify({'error': 'Missing username or password'}), 400
    
    user = mongo.db.users.find_one({'username': username})
    
    if not user or not bcrypt.check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    access_token = create_access_token(identity=str(user['_id']))
    refresh_token = create_refresh_token(identity=str(user['_id']))
    
    return jsonify({
        'message': 'Login successful',
        'user': format_user(user),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 200


@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({'access_token': access_token}), 200


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': format_user(user)}), 200


# ============== TYPING ROUTES ==============

@app.route('/api/typing/words', methods=['GET'])
def get_words():
    count = request.args.get('count', 50, type=int)
    count = min(max(count, 10), 200)
    
    words = random.choices(ENGLISH_WORDS, k=count)
    
    return jsonify({
        'words': words,
        'text': ' '.join(words)
    }), 200


@app.route('/api/typing/quote', methods=['GET'])
def get_quote():
    quote = random.choice(QUOTES)
    
    return jsonify({
        'quote': quote,
        'words': quote.split()
    }), 200


@app.route('/api/typing/result', methods=['POST'])
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


@app.route('/api/typing/results', methods=['GET'])
@jwt_required()
def get_results():
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = {'user_id': ObjectId(user_id)}
    
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


# ============== LEADERBOARD ROUTES ==============

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    mode = request.args.get('mode', 'time')
    mode_value = request.args.get('mode_value', 60, type=int)
    limit = min(request.args.get('limit', 100, type=int), 100)
    
    pipeline = [
        {'$match': {'mode': mode, 'mode_value': mode_value}},
        {'$sort': {'wpm': -1}},
        {'$group': {
            '_id': '$user_id',
            'best_wpm': {'$first': '$wpm'},
            'accuracy': {'$first': '$accuracy'},
            'created_at': {'$first': '$created_at'}
        }},
        {'$sort': {'best_wpm': -1}},
        {'$limit': limit}
    ]
    
    results = list(mongo.db.typing_results.aggregate(pipeline))
    
    user_ids = [r['_id'] for r in results]
    users = {u['_id']: u['username'] for u in mongo.db.users.find({'_id': {'$in': user_ids}})}
    
    leaderboard = []
    for rank, result in enumerate(results, 1):
        leaderboard.append({
            'rank': rank,
            'username': users.get(result['_id'], 'Unknown'),
            'wpm': round(result['best_wpm'], 2),
            'accuracy': round(result['accuracy'], 2),
            'date': result['created_at'].isoformat()
        })
    
    return jsonify({
        'mode': mode,
        'mode_value': mode_value,
        'leaderboard': leaderboard
    }), 200


# ============== HELPER FUNCTIONS ==============

def format_user(user):
    """Format user document for API response."""
    return {
        'id': str(user['_id']),
        'username': user['username'],
        'email': user['email'],
        'created_at': user['created_at'].isoformat(),
        'tests_completed': user.get('tests_completed', 0),
        'tests_started': user.get('tests_started', 0)
    }


def format_result(result, username=None):
    """Format typing result document for API response."""
    return {
        'id': str(result['_id']),
        'user_id': str(result['user_id']),
        'username': username,
        'mode': result['mode'],
        'mode_value': result['mode_value'],
        'language': result.get('language', 'english'),
        'wpm': round(result['wpm'], 2),
        'raw_wpm': round(result['raw_wpm'], 2),
        'accuracy': round(result['accuracy'], 2),
        'correct_chars': result['correct_chars'],
        'incorrect_chars': result['incorrect_chars'],
        'extra_chars': result.get('extra_chars', 0),
        'missed_chars': result.get('missed_chars', 0),
        'test_duration': round(result['test_duration'], 2),
        'created_at': result['created_at'].isoformat()
    }


# ============== MAIN ==============

if __name__ == '__main__':
    # Create indexes on first run
    with app.app_context():
        mongo.db.users.create_index('username', unique=True)
        mongo.db.users.create_index('email', unique=True)
        mongo.db.typing_results.create_index('user_id')
        mongo.db.typing_results.create_index('created_at')
        mongo.db.typing_results.create_index([('mode', 1), ('mode_value', 1)])
    
    app.run(debug=True, port=5000)
