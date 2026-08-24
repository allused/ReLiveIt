# ReLiveIt

Mobile-first wedding photo sharing and voting. Guests upload and swipe-vote. The couple reviews the evening, then sees final rankings after they conclude the wedding.

## Stack

- Frontend: React, TypeScript, Vite, MUI
- Backend: NestJS, TypeORM, PostgreSQL
- Images: local disk in development (swap-ready `ImageStorageService`)

## Run locally

1. Start PostgreSQL:

```bash
docker compose up -d
```

2. Backend:

```bash
cd backend
cp .env.example .env   # already created for local use
npm install
npm run start:dev
```

Migrations run automatically on startup.

3. Seed demo data (in another terminal):

```bash
cd backend
npm run seed
```

4. Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend on 5173, API on 3000, Postgres on **5433** (to avoid clashing with a local Postgres on 5432).

## Demo accounts

- Admin: `admin` / `ChangeMe123!` at `/login`
- Guest and reviewer invitation URLs are written to `backend/seed-invites.dev.txt` (gitignored)

Seed wedding: **Anna & Peter** (`anna-peter-2026`), including a paired guest account (Anna & Bence).

## Product notes

- One category photo per guest, plus up to 30 uncategorized gallery photos
- Swipe left = 0 points, swipe right = +1. One decision per photo. No self-votes
- Rankings: total points, then approval rate, then earlier upload. Top 10 per category after conclusion
- HEIC is not supported; use JPEG, PNG, or WEBP
- Category photos cannot be replaced. Categories with photos cannot be deleted (disable them instead)

## Tests

```bash
cd backend
npm test
npm run test:e2e
```

E2E tests use the `reliveit_test` database created by Docker Compose.

Rate limiting is disabled when `NODE_ENV=development` so local invite links stay usable.
