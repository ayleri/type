# Typrace

A typing test application inspired by MonkeyType and Vim Racer, built with React, Flask, and MongoDB.

## Features

- Multiple test modes: Word Targets (3, 5, 7, 10), and Language (Python, JavaScript, TypeScript, Rust, Go, C)
- Real-time Time, keystrokes and efficiency tracking, including highlighting which key combination being pressed to reach the target is the most optimal for each target.
- User account (register/login)
- Personal statistics and history
- minimal and clean UI inspired by MonkeyType and Vim Racer

## Tech Implemented

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand
- **Backend**: Python, Flask, Flask-PyMongo
- **Database**: MongoDB


## Requirements to use

- Node.js 18+
- Python 3.10+
- MongoDB 6+

## Setup

### Database Setup

1. Install MongoDB and start the service:
   - Download link: https://www.mongodb.com/try/download/community
   - Start MongoDB (the database should auto-create)

### Backend Setup

1. Navigate to the backend directory:
cd backend

2. Create a virtual environment:
python -m venv venv

3. Activate virtual environment:
   - Windows: venv\Scripts\activate
   - macOS/Linux: source venv/bin/activate

4. Install dependencies:
pip install -r requirements.txt

5. Copy example environment file and configure it:
cp .env.example .env

6. Edit .env with MongoDB connection string:
MONGO_URI=mongodb://localhost:27017/monkeytype

7. Initialize database indexes:
flask init-db

8. Run the development server:
python run.py

Click the link to the localhost if this is run on your own computer to run it

### Frontend Setup

1. Navigate to the frontend directory:
cd frontend

2. Install dependencies:
npm install

3. Run the development server:
npm run dev

Again, click the link to the localhost if this is run on your own computer to run it

## API Endpoints

### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login
- POST /api/auth/refresh - Refresh access token
- GET /api/auth/me - Get current user
- PUT /api/auth/me - Update current user

### Typing
- GET /api/typing/words - Get random words for test
- GET /api/typing/quote - Get a random quote
- POST /api/typing/result - Save test result
- GET /api/typing/results - Get user's test history
- GET /api/typing/stats - Get user's statistics

### Leaderboard
- GET /api/leaderboard - Get global leaderboard
- GET /api/leaderboard/daily - Get daily leaderboard

## License

MIT
