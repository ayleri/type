from flask import Blueprint, request, jsonify
from app import db
from app.models.typing_result import TypingResult
from sqlalchemy import func

bp = Blueprint('leaderboard', __name__, url_prefix='/api/leaderboard')


@bp.route('/', methods=['GET'])
def get_leaderboard():
    mode = request.args.get('mode', 'time')
    mode_value = request.args.get('mode_value', 60, type=int)
    limit = request.args.get('limit', 100, type=int)
    limit = min(limit, 100)  # Cap at 100
    
    # Get best score per user for the specified mode
    subquery = db.session.query(
        TypingResult.user_id,
        func.max(TypingResult.wpm).label('best_wpm')
    ).filter(
        TypingResult.mode == mode,
        TypingResult.mode_value == mode_value
    ).group_by(TypingResult.user_id).subquery()
    
    results = db.session.query(TypingResult).join(
        subquery,
        db.and_(
            TypingResult.user_id == subquery.c.user_id,
            TypingResult.wpm == subquery.c.best_wpm,
            TypingResult.mode == mode,
            TypingResult.mode_value == mode_value
        )
    ).order_by(TypingResult.wpm.desc()).limit(limit).all()
    
    leaderboard = []
    for rank, result in enumerate(results, 1):
        leaderboard.append({
            'rank': rank,
            'username': result.user.username,
            'wpm': round(result.wpm, 2),
            'accuracy': round(result.accuracy, 2),
            'date': result.created_at.isoformat()
        })
    
    return jsonify({
        'mode': mode,
        'mode_value': mode_value,
        'leaderboard': leaderboard
    }), 200


@bp.route('/daily', methods=['GET'])
def get_daily_leaderboard():
    from datetime import datetime, timedelta
    
    mode = request.args.get('mode', 'time')
    mode_value = request.args.get('mode_value', 60, type=int)
    
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
    subquery = db.session.query(
        TypingResult.user_id,
        func.max(TypingResult.wpm).label('best_wpm')
    ).filter(
        TypingResult.mode == mode,
        TypingResult.mode_value == mode_value,
        TypingResult.created_at >= start_of_day
    ).group_by(TypingResult.user_id).subquery()
    
    results = db.session.query(TypingResult).join(
        subquery,
        db.and_(
            TypingResult.user_id == subquery.c.user_id,
            TypingResult.wpm == subquery.c.best_wpm,
            TypingResult.mode == mode,
            TypingResult.mode_value == mode_value,
            TypingResult.created_at >= start_of_day
        )
    ).order_by(TypingResult.wpm.desc()).limit(50).all()
    
    leaderboard = []
    for rank, result in enumerate(results, 1):
        leaderboard.append({
            'rank': rank,
            'username': result.user.username,
            'wpm': round(result.wpm, 2),
            'accuracy': round(result.accuracy, 2),
            'date': result.created_at.isoformat()
        })
    
    return jsonify({
        'mode': mode,
        'mode_value': mode_value,
        'date': today.isoformat(),
        'leaderboard': leaderboard
    }), 200
