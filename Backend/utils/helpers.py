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
    # Handle both vim/code mode and typing mode
    mode = result.get('mode', 'typing')
    
    base = {
        'id': str(result['_id']),
        'user_id': str(result['user_id']),
        'username': username,
        'mode': mode,
        'language': result.get('language', 'python'),
        'wpm': round(result.get('wpm', 0), 2),
        'raw_wpm': round(result.get('raw_wpm', 0), 2),
        'accuracy': round(result.get('accuracy', 0), 2),
        'created_at': result['created_at'].isoformat() if result.get('created_at') else None
    }
    
    # Add mode-specific fields
    if mode == 'typing':
        base.update({
            'time_limit': result.get('time_limit', 60),
            'keystrokes': result.get('keystrokes', 0),
            'correct_keystrokes': result.get('correct_keystrokes', 0),
            'words_typed': result.get('words_typed', 0),
            'correct_chars': result.get('correct_keystrokes', 0),
            'incorrect_chars': result.get('keystrokes', 0) - result.get('correct_keystrokes', 0),
            'test_duration': result.get('time_limit', 60),
            'lines_completed': 0,
            'extra_chars': 0,
            'missed_chars': 0,
        })
    else:
        base.update({
            'correct_chars': result.get('correct_chars', 0),
            'incorrect_chars': result.get('incorrect_chars', 0),
            'extra_chars': result.get('extra_chars', 0),
            'missed_chars': result.get('missed_chars', 0),
            'test_duration': round(result.get('test_duration', 0), 2),
            'lines_completed': result.get('lines_completed', 0),
        })
    
    return base
