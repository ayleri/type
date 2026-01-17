from app import create_app, mongo

app = create_app()


@app.cli.command('init-db')
def init_db():
    """Initialize the database indexes."""
    with app.app_context():
        # Create indexes for users collection
        mongo.db.users.create_index('username', unique=True)
        mongo.db.users.create_index('email', unique=True)
        
        # Create indexes for typing_results collection
        mongo.db.typing_results.create_index('user_id')
        mongo.db.typing_results.create_index('created_at')
        mongo.db.typing_results.create_index([('mode', 1), ('mode_value', 1)])
        mongo.db.typing_results.create_index([('user_id', 1), ('mode', 1), ('mode_value', 1)])
        
        print('Database indexes created!')


@app.cli.command('seed-db')
def seed_db():
    """Seed the database with sample data."""
    from app.models.user import User
    
    with app.app_context():
        # Create test user
        if not mongo.db.users.find_one({'username': 'testuser'}):
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            mongo.db.users.insert_one(user.to_mongo())
            print('Test user created: testuser / password123')
        else:
            print('Test user already exists')


if __name__ == '__main__':
    app.run(debug=True, port=5000)
