from app import bcrypt
from datetime import datetime
from bson import ObjectId


class User:
    def __init__(self, username, email, password_hash=None, _id=None, 
                 created_at=None, tests_completed=0, tests_started=0):
        self._id = _id or ObjectId()
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.created_at = created_at or datetime.utcnow()
        self.tests_completed = tests_completed
        self.tests_started = tests_started
    
    @staticmethod
    def from_dict(data):
        if not data:
            return None
        return User(
            _id=data.get('_id'),
            username=data.get('username'),
            email=data.get('email'),
            password_hash=data.get('password_hash'),
            created_at=data.get('created_at'),
            tests_completed=data.get('tests_completed', 0),
            tests_started=data.get('tests_started', 0)
        )
    
    def to_mongo(self):
        return {
            '_id': self._id,
            'username': self.username,
            'email': self.email,
            'password_hash': self.password_hash,
            'created_at': self.created_at,
            'tests_completed': self.tests_completed,
            'tests_started': self.tests_started
        }
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def get_best_wpm(self, mongo_db, mode='time', mode_value=60):
        result = mongo_db.typing_results.find_one(
            {'user_id': self._id, 'mode': mode, 'mode_value': mode_value},
            sort=[('wpm', -1)]
        )
        return result['wpm'] if result else 0
    
    def get_average_wpm(self, mongo_db):
        pipeline = [
            {'$match': {'user_id': self._id}},
            {'$group': {'_id': None, 'avg_wpm': {'$avg': '$wpm'}}}
        ]
        result = list(mongo_db.typing_results.aggregate(pipeline))
        return round(result[0]['avg_wpm'], 2) if result else 0
    
    def get_average_accuracy(self, mongo_db):
        pipeline = [
            {'$match': {'user_id': self._id}},
            {'$group': {'_id': None, 'avg_accuracy': {'$avg': '$accuracy'}}}
        ]
        result = list(mongo_db.typing_results.aggregate(pipeline))
        return round(result[0]['avg_accuracy'], 2) if result else 0
    
    def to_dict(self, mongo_db=None):
        data = {
            'id': str(self._id),
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'tests_completed': self.tests_completed,
            'tests_started': self.tests_started,
        }
        if mongo_db:
            data['best_wpm'] = self.get_best_wpm(mongo_db)
            data['average_wpm'] = self.get_average_wpm(mongo_db)
            data['average_accuracy'] = self.get_average_accuracy(mongo_db)
        else:
            data['best_wpm'] = 0
            data['average_wpm'] = 0
            data['average_accuracy'] = 0
        return data
