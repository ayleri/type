from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app import mongo
from app.models.user import User
from bson import ObjectId

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@bp.route('/register', methods=['POST'])
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
    
    user = User(username=username, email=email)
    user.set_password(password)
    
    mongo.db.users.insert_one(user.to_mongo())
    
    access_token = create_access_token(identity=str(user._id))
    refresh_token = create_refresh_token(identity=str(user._id))
    
    return jsonify({
        'message': 'User registered successfully',
        'user': user.to_dict(mongo.db),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 201


@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    if not all([username, password]):
        return jsonify({'error': 'Missing username or password'}), 400
    
    user_data = mongo.db.users.find_one({'username': username})
    user = User.from_dict(user_data)
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    access_token = create_access_token(identity=str(user._id))
    refresh_token = create_refresh_token(identity=str(user._id))
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(mongo.db),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 200


@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({'access_token': access_token}), 200


@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user_data = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    user = User.from_dict(user_data)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict(mongo.db)}), 200


@bp.route('/me', methods=['PUT'])
@jwt_required()
def update_user():
    user_id = get_jwt_identity()
    user_data = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    user = User.from_dict(user_data)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    update_data = {}
    
    if 'email' in data:
        existing = mongo.db.users.find_one({'email': data['email']})
        if existing and str(existing['_id']) != user_id:
            return jsonify({'error': 'Email already in use'}), 409
        update_data['email'] = data['email']
    
    if 'password' in data:
        if len(data['password']) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        user.set_password(data['password'])
        update_data['password_hash'] = user.password_hash
    
    if update_data:
        mongo.db.users.update_one({'_id': ObjectId(user_id)}, {'$set': update_data})
    
    # Fetch updated user
    user_data = mongo.db.users.find_one({'_id': ObjectId(user_id)})
    user = User.from_dict(user_data)
    
    return jsonify({'user': user.to_dict(mongo.db)}), 200
