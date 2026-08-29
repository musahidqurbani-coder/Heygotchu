# Heygotchu — project handoff

This is a briefing doc for whoever (or whatever coding tool) picks this project up next to deploy it. It covers what the app is, what's built, what's still open, and exactly how it should be deployed based on decisions already made.

## What this is

Heygotchu (formerly called TripFit during early development — all references to the old name have been renamed) is a trip- and occasion-outfit-planning web app. A user builds a digital closet, sets coverage/style preferences (including a hijabi modesty mode), and the app generates outfit plans for a trip or event, with Claude-powered photo tagging and "beyond your closet" suggestions.

It's a small, real product for family/personal use right now — not built for large-scale traffic. Deployment choices below reflect that (free/cheap managed services, not a self-managed VPS).

## Tech stack & architecture

Two separate apps in one repo:

- **Frontend** (repo root): React 19 + TypeScript + Vite + Tailwind CSS v4. Builds to static files (`npm run build` → `dist/`). No server-side rendering — it's a pure static site that talks to the backend over HTTP.
- **Backend** (`server/`): Express + TypeScript + Prisma ORM + PostgreSQL. Stateless JWT auth. Must run as a long-lived Node process (not a static host, not a typical shared-hosting PHP-style host).

They are deployed as two separate services that talk to each other over HTTPS — this is a normal, standard pattern for this stack, not a workaround.

## What's built and working

- **Auth**: email + password signup, email-based OTP verification (6-digit code), login, JWT sessions. Mobile/SMS auth was deliberately removed (an earlier build had Twilio-based SMS OTP; product decision was to drop it and keep email-only).
- **Per-user data isolation**: closet items, preferences, and saved trip/occasion plans are all scoped to the logged-in user (verified via automated tests — a second test user's data comes back empty).
- **Closet CRUD**: add/edit/delete clothing items, each with gender, coverage attributes (sleeve length, neckline, hem length, backless, piece count, swim style), photos.
- **Preferences**: coverage/modesty preferences including a "hijabi" mode with stricter coverage rules baked into the outfit generator (`src/lib/outfitGenerator.ts`), plus a wardrobe-focus setting (women's/men's/unisex).
- **Trip planning**: generates outfit combinations per day of a trip based on weather/vibe and the user's closet + preferences; saved trips persist to the backend.
- **Claude API integration** (backend, `server/src/lib/claude.ts`): photo auto-tagging (vision), "beyond your closet" shopping-style suggestions, and trip vibe description generation. Routes exist and are tested; **no frontend UI calls them yet** (see Open items below).
- **Branding**: renamed from TripFit to Heygotchu throughout. New logo applied (Navbar + signup/verify screens).
- **Animated login screen**: the login screen (not signup, not the OTP-verify screen) now plays a custom 10-second brand video once, which ends on a frame that already looks like the login form; the app then fades in real, functional email/password inputs positioned exactly over the video's drawn boxes, so it looks like the illustration comes alive. Implementation details below under "Login video screen."

## Open items — not built yet

- No frontend UI for the AI photo-tag button (backend endpoint `POST /ai/tag-photo` is ready) or the "beyond your closet" suggestions panel (backend endpoint `POST /ai/suggest` is ready). `src/lib/apiClient.ts` already has `aiApi.tagPhoto` / `aiApi.suggest` client functions — just unused.
- No frontend toggle for "destination trip" vs. "occasion" planning mode, even though the backend supports it (`GET /events/occasion-types`, `EventPlan.mode` field).
- No "forgot password" flow. The login screen has a working hit-target over the video's "Forgot Password?" text, but it currently just shows a message saying this isn't set up yet (`AuthGate.tsx`, `onForgotPassword` prop).

None of this blocks a first deploy — the app is fully usable for signup → closet → trip planning → save without any of the above.

## Environment variables

All secrets live in `server/.env` (never in the frontend — the frontend only needs to know the backend's URL). Copy `server/.env.example` to `server/.env` and fill in:

| Variable | Required? | What it's for | Status as of this handoff |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | **Not yet obtained.** A Neon project named `heygotchu` was created (Neon org: Heygotchu, project ID `holy-cake-55964951`) but the connection string itself was never captured into this doc — get it from the Neon dashboard's "Connect to your database" panel (pick "Prisma" as the framework if offered) before deploying. |
| `JWT_SECRET` | Yes | Signs login sessions | **Not yet generated.** Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and treat it as a real secret. |
| `PORT` | No (default 4000) | Backend port | Only matters for local dev / self-hosting; Render assigns its own port automatically via `process.env.PORT`, which the app already reads. |
| `CORS_ORIGIN` | Recommended | Which frontend origin(s) may call the API | Set to the deployed frontend's URL once known (e.g. `https://heygotchu.com` or the Vercel preview URL), comma-separated if multiple. |
| `ANTHROPIC_API_KEY` | No, but needed for AI features | Claude API — photo tagging, suggestions, vibe text | **Not yet obtained.** From console.anthropic.com → Settings → API Keys. Without it, `/ai/tag-photo` and `/ai/suggest` return a clean 503; everything else still works. |
| `RESEND_API_KEY` | No, but needed for real emails | Sends OTP verification emails | **Not yet obtained.** From resend.com (free tier: 3,000/month, 100/day). Without it, the app runs in "dev mode" — the OTP code is returned directly in the API response and shown on-screen instead of emailed, so auth still works end-to-end for testing. |
| `EMAIL_FROM` | No (has a default) | The "from" address for OTP emails | Defaults to `Heygotchu <onboarding@resend.dev>` (Resend's shared sending address). Once the `heygotchu.com` domain is verified with Resend, change this to something like `Heygotchu <noreply@heygotchu.com>`. |
| `OTP_EXPIRY_MINUTES`, `OTP_MAX_ATTEMPTS`, `MAX_UPLOAD_BYTES` | No | Tuning knobs, sensible defaults already set | Leave as-is unless there's a specific reason to change them. |

Frontend needs exactly one variable, in a root-level `.env` (copy from `.env.example`):

| Variable | What it's for |
|---|---|
| `VITE_API_URL` | The deployed backend's base URL (e.g. `https://heygotchu-api.onrender.com`). Defaults to `http://localhost:4000` for local dev. |

## Deployment plan (decided, not just an option)

A VPS deployment was considered and explicitly ruled out for now — the available VPS is managed by someone else (a developer) for a separate, bigger project, and the owner doesn't have easy access to it. Given this is a small family-scale app, the plan is three free/cheap managed services instead, none of which touch that VPS at all:

1. **Neon** — PostgreSQL. Project already created (see table above); just needs the connection string captured.
2. **Render** — hosts the Express/Prisma backend as a persistent web service. Free tier is fine at this scale (it spins down after ~15 min idle and takes ~30s to wake on the next request — acceptable for family use). Build command: `npm install && npm run build` (from the `server/` directory). Start command: `npm start`. Needs all the `server/.env` variables above set as Render environment variables, plus running `npx prisma migrate deploy` once against the Neon database (either as a Render "pre-deploy" command or manually before first launch).
3. **Vercel** — hosts the frontend as a static site. Build command: `npm run build` (repo root). Output directory: `dist`. Needs `VITE_API_URL` set to the Render backend's URL.
4. **Domain (heygotchu.com)**: point it at Vercel per Vercel's own domain-connection instructions (they'll specify the exact A/CNAME records once the domain is added in the Vercel project settings — normally an A record for the root and a CNAME for `www`). Separately, verify `heygotchu.com` with Resend (Resend dashboard → Domains → Add Domain) by adding the SPF/DKIM TXT records it provides, then switch `EMAIL_FROM` to use the real domain.

Sign-up-only steps already done by the account owner: Neon account + project created. Render and Vercel accounts were about to be created next (no confirmation yet that they exist).

## Login video screen — implementation details

Files:
- `src/components/LoginVideoScreen.tsx` — the component. Renders the video (`public/videos/login-intro.mp4`, ~3.2MB, 1280×720, 10s, 24fps) inside a `16:9` container, freezes on the last frame after it ends (or immediately, skipping the video, on repeat visits within the same browser session — tracked via `sessionStorage` key `heygotchu.loginIntroSeen.v1` — and for users with `prefers-reduced-motion` set), then fades in real `<input>` elements and invisible link buttons positioned exactly over the boxes the video draws.
- `src/assets/login-poster.jpg` — a still of the video's exact last frame, used as the `<video>` element's `poster` and as the persistent background once the intro is done.
- `src/components/AuthGate.tsx` — only the plain login screen (`screen === 'login' && !verify`) uses `LoginVideoScreen`; signup and the OTP-verify screen still use the original simple card layout with the static logo image.

The overlay positions (`EMAIL_BOX`, `PASSWORD_BOX`, `FORGOT_LINK`, `SIGNUP_LINK` constants at the top of `LoginVideoScreen.tsx`) were measured directly off the video's own final frame in pixels (on the 1280×720 source) and stored as percentages, so they scale correctly at any display size via CSS container query units (`cqw`) for font sizing. **If the source video is ever re-exported with a different layout, these percentages need to be re-measured and updated**, or the invisible form fields will drift out of alignment with the drawn artwork.

The email/password inputs are transparent (so the video's drawn "Email"/"Password" labels show through) until the user types something, at which point they switch to an opaque fill color sampled from the video (`EMAIL_FILL` / `PASSWORD_FILL` constants) so typed text doesn't visually double up with the baked-in label.

## Repo structure quick reference

```
/                       frontend (Vite root)
  src/
    components/         UI components (AuthGate, LoginVideoScreen, Navbar, ClosetManager, etc.)
    context/AuthContext.tsx   auth state, wraps apiClient's auth calls
    lib/apiClient.ts    typed fetch client for the backend
    lib/outfitGenerator.ts   outfit-matching + coverage rule logic
    assets/             logo.jpg, login-poster.jpg
  public/videos/        login-intro.mp4 (served as a static file, not bundled)
  .env.example          documents VITE_API_URL

server/                 backend
  src/
    routes/             auth, closet, preferences, events, ai, images, vibe
    lib/                claude.ts, email.ts, otp.ts, occasions.ts
    middleware/         auth.ts (JWT check), errorHandler.ts
  prisma/schema.prisma  DB schema (provider is "postgresql" — do not commit a "sqlite" swap; that's only ever used temporarily for local testing)
  .env.example          documents every backend env var (see table above)
```

## Suggested first-deploy order

1. Get the Neon `DATABASE_URL` from the dashboard.
2. Generate a `JWT_SECRET`.
3. Deploy `server/` to Render with those two variables set (plus `CORS_ORIGIN` once the frontend URL is known); run `npx prisma migrate deploy` once against the Neon database.
4. Deploy the repo root to Vercel with `VITE_API_URL` pointing at the live Render URL.
5. Confirm signup → OTP (dev-mode code shown on screen, since `RESEND_API_KEY` isn't set yet) → closet → trip flow all work end-to-end on the live URLs.
6. Add `ANTHROPIC_API_KEY` and `RESEND_API_KEY` to Render once obtained, to turn on real AI features and real OTP emails.
7. Connect `heygotchu.com` to the Vercel project, and verify the domain with Resend, updating `EMAIL_FROM` afterward.
