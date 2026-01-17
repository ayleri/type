from app import create_app, mongo

app = create_app()


@app.cli.command('init-db')
def init_db():
    """Initialize database indexes."""
    with app.app_context():
        mongo.db.users.create_index('username', unique=True)
        mongo.db.users.create_index('email', unique=True)
        mongo.db.typing_results.create_index('user_id')
        mongo.db.typing_results.create_index('created_at')
        mongo.db.typing_results.create_index([('mode', 1), ('mode_value', 1)])
        print('Database indexes created!')


@app.cli.command('seed-db')
def seed_db():
    """Seed the database with sample data."""
    from app import bcrypt
    from datetime import datetime
    
    with app.app_context():
        if not mongo.db.users.find_one({'username': 'testuser'}):
            user = {
                'username': 'testuser',
                'email': 'test@example.com',
                'password_hash': bcrypt.generate_password_hash('password123').decode('utf-8'),
                'created_at': datetime.utcnow(),
                'tests_completed': 0,
                'tests_started': 0
            }
            mongo.db.users.insert_one(user)
            print('Test user created: testuser / password123')
        else:
            print('Test user already exists')


if __name__ == '__main__':
    app.run(debug=True, port=5000)
