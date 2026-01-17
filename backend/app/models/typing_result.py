from datetime import datetime
from bson import ObjectId


class TypingResult:
    def __init__(self, user_id, mode, mode_value, wpm, raw_wpm, accuracy,
                 correct_chars, incorrect_chars, test_duration, _id=None,
                 language='english', extra_chars=0, missed_chars=0,
                 created_at=None, username=None):
        self._id = _id or ObjectId()
        self.user_id = user_id
        self.mode = mode
        self.mode_value = mode_value
        self.language = language
        self.wpm = wpm
        self.raw_wpm = raw_wpm
        self.accuracy = accuracy
        self.correct_chars = correct_chars
        self.incorrect_chars = incorrect_chars
        self.extra_chars = extra_chars
        self.missed_chars = missed_chars
        self.test_duration = test_duration
        self.created_at = created_at or datetime.utcnow()
        self.username = username  # For display purposes
    
    @staticmethod
    def from_dict(data, username=None):
        if not data:
            return None
        return TypingResult(
            _id=data.get('_id'),
            user_id=data.get('user_id'),
            mode=data.get('mode'),
            mode_value=data.get('mode_value'),
            language=data.get('language', 'english'),
            wpm=data.get('wpm'),
            raw_wpm=data.get('raw_wpm'),
            accuracy=data.get('accuracy'),
            correct_chars=data.get('correct_chars'),
            incorrect_chars=data.get('incorrect_chars'),
            extra_chars=data.get('extra_chars', 0),
            missed_chars=data.get('missed_chars', 0),
            test_duration=data.get('test_duration'),
            created_at=data.get('created_at'),
            username=username
        )
    
    def to_mongo(self):
        return {
            '_id': self._id,
            'user_id': self.user_id,
            'mode': self.mode,
            'mode_value': self.mode_value,
            'language': self.language,
            'wpm': self.wpm,
            'raw_wpm': self.raw_wpm,
            'accuracy': self.accuracy,
            'correct_chars': self.correct_chars,
            'incorrect_chars': self.incorrect_chars,
            'extra_chars': self.extra_chars,
            'missed_chars': self.missed_chars,
            'test_duration': self.test_duration,
            'created_at': self.created_at
        }
    
    def to_dict(self):
        return {
            'id': str(self._id),
            'user_id': str(self.user_id),
            'username': self.username,
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
