from flask import Blueprint, request, jsonify
from app import mongo
from app.models.typing_result import TypingResult
from datetime import datetime

bp = Blueprint('leaderboard', __name__, url_prefix='/api/leaderboard')


@bp.route('/', methods=['GET'])
def get_leaderboard():
    mode = request.args.get('mode', 'time')
    mode_value = request.args.get('mode_value', 60, type=int)
    limit = request.args.get('limit', 100, type=int)
    limit = min(limit, 100)  # Cap at 100
    
    # Get best score per user for the specified mode using aggregation
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
    
    # Get usernames for all users
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


@bp.route('/daily', methods=['GET'])
def get_daily_leaderboard():
    mode = request.args.get('mode', 'time')
    mode_value = request.args.get('mode_value', 60, type=int)
    
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
    pipeline = [
        {'$match': {
            'mode': mode,
            'mode_value': mode_value,
            'created_at': {'$gte': start_of_day}
        }},
        {'$sort': {'wpm': -1}},
        {'$group': {
            '_id': '$user_id',
            'best_wpm': {'$first': '$wpm'},
            'accuracy': {'$first': '$accuracy'},
            'created_at': {'$first': '$created_at'}
        }},
        {'$sort': {'best_wpm': -1}},
        {'$limit': 50}
    ]
    
    results = list(mongo.db.typing_results.aggregate(pipeline))
    
    # Get usernames for all users
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
        'date': today.isoformat(),
        'leaderboard': leaderboard
    }), 200
