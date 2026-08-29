# Heygotchu backend

Express + TypeScript + Prisma API for Heygotchu: accounts (email + password,
OTP-verified by email), a fully isolated closet/preferences/saved-plans
store per account, and Claude API integration for photo auto-tagging and AI
suggestions.

## Quick start

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL and JWT_SECRET at minimum
npx prisma generate
npx prisma migrate dev --name init   # creates the tables in your database
npm run dev
```

The API listens on `http://localhost:4000` by default — matching the
frontend's default `VITE_API_URL`, so the two pair up with zero extra
configuration for local development.

## Required setup

### 1. A PostgreSQL database (free: Neon)

1. Create a free account at [neon.tech](https://neon.tech) and a new project.
2. Copy the connection string it gives you (it includes `?sslmode=require`).
3. Paste it into `.env` as `DATABASE_URL`.
4. Run `npx prisma migrate dev --name init` once to create the tables.

Any other PostgreSQL host works the same way — Neon is just the easiest free
option. `prisma/schema.prisma` targets `postgresql`; nothing else to change.

### 2. A JWT signing secret

Any long random string works. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Set it as `JWT_SECRET` in `.env`. Everyone's login session is a JWT signed
with this — treat it like a password.

That's it for the minimum runnable setup — signup, login, OTP verification
(in dev mode, see below), and every closet/preferences/saved-plan route all
work with just those two variables set.

## Optional integrations (all have a dev-mode fallback)

Nothing below is required to run the server. Each one degrades gracefully
when unset, exactly like the frontend's existing weather/image fallback
pattern — the app is never broken by a missing key, it just runs in a
reduced "dev mode" until you add one.

### Email OTP — Resend

1. Create a free account at [resend.com](https://resend.com).
2. Create an API key and set it as `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to a sender address Resend allows (their sandbox domain
   `onboarding@resend.dev` works immediately with no domain verification).

Without `RESEND_API_KEY` set, `/auth/send-otp` doesn't actually send an
email — it logs the code to the server console **and returns it in the API
response** as `devCode`, so signup/login flows keep working end-to-end
during development. The frontend's verification screen shows this code
directly when present.

> **No mobile/SMS verification.** Heygotchu verifies accounts by email only —
> signup just collects an email and password. (An earlier version of this
> backend also supported mobile number + SMS OTP via Twilio; that was
> removed to keep account verification to one channel. If you want SMS back
> later, the pattern to follow is: add a `sendOtpSms()` function shaped like
> `sendOtpEmail()` in `src/lib/email.ts`, add a `mobile` column back onto
> `User` in `prisma/schema.prisma`, and offer a channel choice in
> `/auth/send-otp` and the frontend's `AuthGate`.)

### Claude API — photo tagging & AI suggestions

1. Get a key from [console.anthropic.com](https://console.anthropic.com).
2. Set `ANTHROPIC_API_KEY`.

Without it, `POST /ai/tag-photo` and `POST /ai/suggest` return a clear 503
("needs an Anthropic API key") instead of crashing — everything else in the
app (manual item entry, outfit generation, saved trips) works normally
either way.

### Destination photos — Unsplash

1. Get a free key from [unsplash.com/developers](https://unsplash.com/developers).
2. Set `UNSPLASH_ACCESS_KEY`.

Without it, `GET /images/destination` returns 404 and the frontend falls
back to a curated/stock photo, as before.

## API overview

All routes are JSON. Authenticated routes expect `Authorization: Bearer
<token>` (the token from `/auth/login` or `/auth/verify-otp`), and every one
of them scopes its query to the authenticated `userId` — that's what keeps
each account's data isolated from every other account.

| Route | Auth | Notes |
|---|---|---|
| `POST /auth/signup` | — | `{ email, password }` → creates an unverified account |
| `POST /auth/send-otp` | — | `{ userId }` or `{ email }` — sends a fresh code to that account's email |
| `POST /auth/verify-otp` | — | `{ userId, code }` → activates the account and returns a token |
| `POST /auth/login` | — | `{ email, password }` |
| `GET /auth/me` | ✓ | current account |
| `GET/POST /closet`, `DELETE /closet/:id` | ✓ | the signed-in account's clothing items |
| `GET/PUT /preferences` | ✓ | the signed-in account's saved ClothingPreferences |
| `GET/POST /events`, `DELETE /events/:id` | ✓ | saved trip or occasion plans (`mode: "destination" \| "occasion"`) |
| `GET /events/occasion-types` | ✓ | the built-in catalog of ~40 occasion/theme types |
| `POST /ai/tag-photo` | ✓ | multipart `photo` field → structured item attributes |
| `POST /ai/suggest` | ✓ | `{ contextLabel }` → new item suggestions beyond the closet |
| `GET /images/destination?query=` | — | Unsplash photo proxy |
| `POST /vibe/describe` | — | `{ destination, vibes, days }` → one-sentence AI trip description |

## Data model notes

- `ClothingItem.tags` / `.coverage`, `ClothingPreferences.data`, and
  `EventPlan.data` are stored as JSON-serialized `String` columns rather than
  Prisma's native `Json` type. This was a deliberate fix: Prisma's SQLite
  connector doesn't support `Json` at all, and this project was developed
  and tested locally against SQLite (no Postgres available in that
  environment) before shipping with `postgresql` as the schema's actual
  provider — plain `String` columns behave identically on both, so what was
  tested locally is exactly the code path that runs in production.
- Saved trips and occasions share one `EventPlan` table (`mode` field) and
  store the full plan as JSON, mirroring what the frontend already builds
  client-side — a deliberate simplicity tradeoff over full relational
  normalization.

## Deploying

Any Node host works (Render, Railway, Fly.io, a VPS, etc.):

1. Set all the environment variables above in the platform's dashboard.
2. Build: `npm run build`.
3. Run migrations once against the production database: `npx prisma migrate deploy`.
4. Start: `npm start`.
5. Point the frontend's `VITE_API_URL` at this server's deployed URL and
   rebuild the frontend.

Set `CORS_ORIGIN` to your deployed frontend's exact origin in production
instead of the default `*`.
