from app import db, bcrypt
from datetime import datetime


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Statistics
    tests_completed = db.Column(db.Integer, default=0)
    tests_started = db.Column(db.Integer, default=0)
    
    # Relationships
    typing_results = db.relationship('TypingResult', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def get_best_wpm(self, mode='time', mode_value=60):
        from app.models.typing_result import TypingResult
        result = TypingResult.query.filter_by(
            user_id=self.id,
            mode=mode,
            mode_value=mode_value
        ).order_by(TypingResult.wpm.desc()).first()
        return result.wpm if result else 0
    
    def get_average_wpm(self):
        from app.models.typing_result import TypingResult
        from sqlalchemy import func
        result = db.session.query(func.avg(TypingResult.wpm)).filter_by(user_id=self.id).scalar()
        return round(result, 2) if result else 0
    
    def get_average_accuracy(self):
        from app.models.typing_result import TypingResult
        from sqlalchemy import func
        result = db.session.query(func.avg(TypingResult.accuracy)).filter_by(user_id=self.id).scalar()
        return round(result, 2) if result else 0
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'tests_completed': self.tests_completed,
            'tests_started': self.tests_started,
            'best_wpm': self.get_best_wpm(),
            'average_wpm': self.get_average_wpm(),
            'average_accuracy': self.get_average_accuracy()
        }
