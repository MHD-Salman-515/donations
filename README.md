# Backend (MongoDB Atlas)

This backend now runs on MongoDB Atlas and uses `MONGODB_URI` + `DB_NAME` from environment variables only.

## 1) Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your env file from template:
   ```bash
   copy .env.example .env
   ```
3. Set your MongoDB Atlas URI in `.env`:
   - `MONGODB_URI=mongodb+srv://<USER>:<PASS>@cluster0.ecjqjqg.mongodb.net/donations_db?retryWrites=true&w=majority&appName=Cluster0`
   - `DB_NAME=donations_db`
4. Set `JWT_SECRET` and `PORT`.

## 2) Required Environment Variables

- `MONGODB_URI` (required)
- `DB_NAME` (defaults to `donations_db`)
- `PORT` (defaults to `5000`)
- `JWT_SECRET` (required for auth)
- `NODE_ENV` (`development` or `production`)
- `SEED_ADS` (`true`/`false`, optional)

## 3) Run

- Development:
  ```bash
  npm run dev
  ```
- Production:
  ```bash
  npm start
  ```

On startup you should see:
- `Connected to MongoDB Atlas (db: donations_db)`
- `Server running on <PORT>`

## 4) Postman Quick Test

1. `POST /api/auth/register`
   ```json
   {
     "name": "Test User",
     "email": "test@example.com",
     "password": "123456",
     "role": "donor"
   }
   ```
2. `POST /api/auth/login` with same credentials.
3. Copy `token` and call protected routes with:
   - `Authorization: Bearer <token>`
4. Create user (admin route): `POST /api/users`
5. Confirm the user document appears in Atlas `donations_db.users`.

## 5) Verify Data with mongosh

Connect with Atlas URI:
```bash
mongosh "<your MONGODB_URI>"
```

Then run:
```javascript
use donations_db

db.users.find().limit(5)
db.campaigns.find().limit(5)
db.donations.find().limit(5)
db.audit_logs.find().limit(5)
db.refresh_tokens.find().limit(5)
db.settings.find().limit(5)
db.advertisements.find().limit(5)
```

## 6) Startup Indexes and Seeding

On startup, the app ensures indexes safely:
- `users.email` unique
- `settings.id` unique
- `advertisements.id` unique
- `advertisements` compound index on `{ status: 1, start_date: 1, end_date: 1 }`

If duplicates prevent unique index creation, the app logs a warning with a suggested fix query.

Default settings seed runs only when `settings` is empty.
Advertisements are **not** auto-seeded unless `SEED_ADS=true`.

