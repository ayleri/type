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
        'language': result.get('language', 'python'),
        'wpm': round(result['wpm'], 2),
        'raw_wpm': round(result['raw_wpm'], 2),
        'accuracy': round(result['accuracy'], 2),
        'correct_chars': result['correct_chars'],
        'incorrect_chars': result['incorrect_chars'],
        'extra_chars': result.get('extra_chars', 0),
        'missed_chars': result.get('missed_chars', 0),
        'test_duration': round(result['test_duration'], 2),
        'lines_completed': result.get('lines_completed', 0),
        'created_at': result['created_at'].isoformat()
    }
