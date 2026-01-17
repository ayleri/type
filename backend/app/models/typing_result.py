from app import db
from datetime import datetime


class TypingResult(db.Model):
    __tablename__ = 'typing_results'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Test configuration
    mode = db.Column(db.String(20), nullable=False)  # 'time', 'words', 'quote'
    mode_value = db.Column(db.Integer, nullable=False)  # 15, 30, 60, 120 for time; 10, 25, 50, 100 for words
    language = db.Column(db.String(20), default='english')
    
    # Results
    wpm = db.Column(db.Float, nullable=False)
    raw_wpm = db.Column(db.Float, nullable=False)
    accuracy = db.Column(db.Float, nullable=False)
    
    # Character stats
    correct_chars = db.Column(db.Integer, nullable=False)
    incorrect_chars = db.Column(db.Integer, nullable=False)
    extra_chars = db.Column(db.Integer, default=0)
    missed_chars = db.Column(db.Integer, default=0)
    
    # Time stats
    test_duration = db.Column(db.Float, nullable=False)  # in seconds
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'mode': self.mode,
            'mode_value': self.mode_value,
            'language': self.language,
            'wpm': round(self.wpm, 2),
            'raw_wpm': round(self.raw_wpm, 2),
            'accuracy': round(self.accuracy, 2),
            'correct_chars': self.correct_chars,
            'incorrect_chars': self.incorrect_chars,
            'extra_chars': self.extra_chars,
            'missed_chars': self.missed_chars,
            'test_duration': round(self.test_duration, 2),
            'created_at': self.created_at.isoformat()
        }
