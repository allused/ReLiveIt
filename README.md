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
- JPEG, PNG, WebP, and iPhone HEIC/HEIF photos are supported. HEIC is converted to JPEG on upload so every browser can display it
- Category photos cannot be replaced. Categories with photos cannot be deleted (disable them instead)

## Tests

```bash
cd backend
npm test
npm run test:e2e
```

E2E tests use the `reliveit_test` database created by Docker Compose.

Rate limiting is disabled when `NODE_ENV=development` so local invite links stay usable.

## Production

One public HTTPS site: Caddy serves the built frontend, proxies `/api` to Nest, and stores Postgres plus uploaded photos on Docker volumes.

1. On the server, copy the example env and fill in real values:

```bash
cd ReLiveIt
cp .env.production.example .env.production
```

Generate secrets:

```bash
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 32   # SESSION_SECRET
openssl rand -hex 32   # INVITATION_TOKEN_HASH_SECRET
openssl rand -hex 32   # INVITATION_TOKEN_ENCRYPTION_KEY
```

Set `FRONTEND_URL` to the exact origin guests will open (`https://photos.example.com`). Invite QR codes are built from this. Set `SITE_ADDRESS` to the same hostname (no `https://`). Set a unique `ADMIN_USERNAME` / `ADMIN_PASSWORD` (12+ characters, not the demo password).

2. Point DNS at the server and open ports **80** and **443**. Then:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Caddy issues a Let's Encrypt certificate for `SITE_ADDRESS`. Check `https://your-domain/api/health`.

3. Sign in at `/login` with the admin you set, then create the real wedding in the UI. **Do not run `npm run seed`.** That command is blocked in production and would create the demo wedding plus `admin` / `ChangeMe123!`.

4. Print a few guest QRs and do a phone dry run: scan, name, upload (including an iPhone photo), vote, conclude, rankings, gallery zip.

### HTTP dry run on this machine

In `.env.production` use `SITE_ADDRESS=:80`, `FRONTEND_URL=http://localhost`, and `COOKIE_SECURE=false`. Then open `http://localhost`.

### Backups

A Docker volume is not a backup. Before the wedding, and during the day:

```bash
./deploy/backup.sh
```

That writes `backups/reliveit-<timestamp>/postgres.sql` and `uploads.tar`. Copy those off the server. Do not run `docker compose down -v` against the production file.
