# Campus Loop MVP

Campus Loop is a campus marketplace where verified students can list, browse, and inquire about items to buy, sell, or rent. This MVP focuses on core backend logic with a clean, functional frontend.
Campus Loop helps students save money, reduce waste, and build a trusted campus community through smart peer-to-peer buying, selling, and renting.
## Tech Stack
- Frontend: React + Vite (JavaScript)
- Styling: Tailwind CSS CDN
- Backend: Node.js + Express
- Database: SQLite (better-sqlite3)
- Auth: JWT + bcrypt
- Chat: Polling every 3 seconds

## Quick Start

### Backend
```bash
cd server
npm install
node index.js
```

### Frontend
```bash
cd client
npm install
npm run dev
```

## Seeded Accounts

Admin:
- email: admin@university.edu
- password: admin123

Student:
- email: student1@university.edu
- password: test123

## OTP Notes
- OTPs are logged to the server console during registration.
- OTPs expire after 10 minutes.

## Environment Options
- `ALLOW_ANY_EMAIL=1` to allow any email domain during registration.
- `JWT_SECRET=your_secret` to override the default JWT secret.

## API Notes
- Base URL: `http://localhost:5000/api`
- Listings are filtered to `is_available = 1` by default.
- Chat polling is handled on the frontend every 3 seconds.
