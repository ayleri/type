from app import create_app, db

app = create_app()


@app.cli.command('init-db')
def init_db():
    """Initialize the database."""
    db.create_all()
    print('Database initialized!')


@app.cli.command('seed-db')
def seed_db():
    """Seed the database with sample data."""
    from app.models.user import User
    
    # Create test user
    if not User.query.filter_by(username='testuser').first():
        user = User(username='testuser', email='test@example.com')
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()
        print('Test user created: testuser / password123')
    else:
        print('Test user already exists')


if __name__ == '__main__':
    app.run(debug=True, port=5000)
