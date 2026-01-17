# MonkeyType Clone

A typing test application inspired by MonkeyType, built with React, Flask, and MongoDB.

## Features

- 🎯 Multiple test modes: Time-based (15s, 30s, 60s, 120s) and Word count (10, 25, 50, 100)
- 📊 Real-time WPM and accuracy tracking
- 👤 User authentication (register/login)
- 🏆 Global leaderboards
- 📈 Personal statistics and history
- 🎨 Clean, minimal UI inspired by MonkeyType

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand
- **Backend**: Python, Flask, Flask-PyMongo
- **Database**: MongoDB

## Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB 6+

## Setup

### Database Setup

1. Install MongoDB and start the service:
   - Download from https://www.mongodb.com/try/download/community
   - Start MongoDB service (it will auto-create the database)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Copy the example environment file and configure it:
```bash
cp .env.example .env
```

6. Edit `.env` with your MongoDB connection string:
```
MONGO_URI=mongodb://localhost:27017/monkeytype
```

7. Initialize database indexes:
```bash
flask init-db
```

8. (Optional) Seed with test data:
```bash
flask seed-db
```

9. Run the development server:
```bash
python run.py
```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update current user

### Typing
- `GET /api/typing/words` - Get random words for test
- `GET /api/typing/quote` - Get a random quote
- `POST /api/typing/result` - Save test result
- `GET /api/typing/results` - Get user's test history
- `GET /api/typing/stats` - Get user's statistics

### Leaderboard
- `GET /api/leaderboard` - Get global leaderboard
- `GET /api/leaderboard/daily` - Get daily leaderboard

## Project Structure

```
type/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   └── typing_result.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       ├── typing.py
│   │       └── leaderboard.py
│   ├── config.py
│   ├── run.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── TestConfig.tsx
│   │   │   └── TypingTest.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── stores/
│   │   │   ├── authStore.ts
│   │   │   └── typingStore.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
└── README.md
```

## License

MIT
