# Heygotchu — Pack smarter, dress better

Plan trip and occasion outfits from the clothes you already own. Sign up,
add your closet, tell Heygotchu where you're going (or what event you're
dressing for) and it reads your closet + the destination's weather to build
a day-by-day outfit plan and packing list — respecting your saved coverage
and style preferences the whole way through.

Built with React, TypeScript, Vite, and Tailwind CSS on the frontend, and an
Express + Prisma + PostgreSQL backend for accounts and per-user data. Every
account is fully isolated — your closet, preferences, and saved plans are
never visible to anyone else.

## Two parts, two `npm install`s

```
heygotchu/
├── src/            The React frontend (this folder)
└── server/         The Express + Prisma API — see server/README.md
```

Both need their own `npm install` and their own dev server running. See
"Quick start" below for the frontend; **server/README.md has the backend's
setup** (database, JWT secret, and the optional AI/email/photo
integrations) — do that first, since the frontend needs it to do anything
beyond the landing page.

## Quick start (frontend)

```bash
npm install
cp .env.example .env   # VITE_API_URL — defaults to http://localhost:4000, which matches the backend's default port
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`). You'll land on
a sign-up/login screen — the backend (see `server/README.md`) needs to be
running for anything past that to work.

Other scripts:

```bash
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
npm run lint     # oxlint
```

## How it works

1. **Create an account.** Email address and a password — then verify with a
   one-time code sent to your email. See "Accounts & verification" below.
2. **Add your closet.** On first sign-in your closet is empty — add items
   one at a time (name, category, department, color, warmth, formality,
   rain/wind resistance, coverage & fit, optional photo) or click **"Load a
   starter closet"** for a ~40-item demo wardrobe so you can try the app
   immediately. It's yours alone — no other account can see or affect it.
3. **Set your clothing preferences (optional, once).** Size, optional
   measurements, preferred length, sleeve preference, coverage preference,
   modesty style (including a stricter Hijabi mode), wardrobe focus
   (women's/men's/unisex), style, and the **More Coverage** toggle (on by
   default) — saved to your account and automatically applied to every
   future outfit. See "Coverage & fit rules" below.
4. **Plan a trip or an occasion.** Enter a destination, start/end dates, and
   pick a vibe (Beach, Hiking, City, Culture, …) for a day-by-day itinerary —
   this covers per-trip weather (fetched automatically). Or plan for a
   single event instead (see "Occasion planning" below).
5. **Generate.** Heygotchu geocodes the destination, pulls a weather forecast
   (or a seasonal estimate for dates too far out), and runs a scoring
   algorithm that matches your wardrobe to each day's temperature,
   precipitation, chosen vibe, and your saved clothing preferences — while
   rotating items so you're not wearing the same top every day.
6. **Review the plan.** A destination color palette, a written "vibe"
   summary, a weather outlook strip, a day-by-day outfit itinerary, and an
   aggregated, checkable packing list with gaps called out (e.g. "no
   weatherproof outerwear in your closet").
7. **Regenerate, Save, or Share.** Reroll for different combinations, save
   the trip to your account for later (from any device you log into), or
   share/copy a text summary.

## Accounts & verification

Every account requires an email address and a password. After signing up,
Heygotchu sends a 6-digit code to that email address, and verifying with it
activates the account. Until a real email provider is configured on the
backend, this runs in **dev mode**: the code is shown directly on the
verification screen instead of actually being emailed, so you can try the
whole flow immediately. See `server/README.md` for adding Resend to send
real emails.

Your closet, preferences, and saved trips/occasions are scoped to your
account on the backend — signing in from a different browser or device
shows the same data, and no other account can read or modify it.

## Coverage & fit rules

**Preferences** (in the nav bar) is a saved profile — size, optional
measurements, preferred length, sleeve preference, coverage preference,
modesty style, wardrobe focus, and style — that's automatically applied to
every outfit generated from then on, with no need to re-enter it per trip.

The generator never changes *you* to fit the clothes — it only ever
recommends from what's in your closet, filtered and biased toward your
preferences. Three layers build on each other:

- **Hard rules (always on, regardless of the toggle).** Heygotchu never
  recommends a sleeveless, strapless/spaghetti-strap/bare-shoulder, or
  backless top or dress, a deep neckline, an overly tight fit, a mini skirt,
  very short shorts (above the knee), or a dress/skirt shorter than the
  knee. An item that violates these can still be logged in your closet
  (it's your actual wardrobe, logged honestly) — it's flagged **"Not
  recommended"** in the closet view and simply never appears in a generated
  outfit.
- **Hijabi modesty style (opt-in, in Preferences).** Layers a stricter tier
  on top of the hard rules: full sleeves only, high neckline only,
  ankle-or-full length only, no shorts, and swimwear limited to modest/
  burkini-style pieces — plus a bias toward including a hijab/headscarf from
  your closet when generating outfits.
- **More Coverage toggle (on by default).** A *soft* bias layered on top —
  when on, the generator additionally favors fuller sleeves, higher
  necklines, longer hems, and pants over shorts/skirts. Turning it off
  doesn't unlock anything the hard rules exclude.
- **Safety net.** After a plan is generated, every day is re-validated
  against the hard (and, if applicable, Hijabi-tier) rules before it's
  shown; if anything were to slip through, it's swapped for a compliant
  alternative automatically.

Each closet item can also be tagged with a **department** (women's, men's,
or unisex) and, where relevant, **backless** and **piece count** (one-piece
vs. two-piece — useful for dresses/co-ords and swimwear, alongside a
dedicated swim style: one-piece, two-piece, or modest/burkini-style).

## AI features (backend, optional)

Two features call the Claude API on the backend — both need
`ANTHROPIC_API_KEY` set in `server/.env` (see `server/README.md`):

- **Photo auto-tagging.** Upload a photo of a clothing item and Claude
  identifies its category, department, color, warmth, formality, and
  coverage attributes to prefill the add-item form.
- **Beyond-your-closet suggestions.** For a given trip or occasion, Claude
  suggests new items worth adding — never violating your saved coverage
  rules — rather than only remixing what you already own.

> **Status:** both endpoints are fully implemented and tested on the
> backend (`POST /ai/tag-photo`, `POST /ai/suggest` — see
> `server/README.md`). Wiring a "scan a photo" button into the add-item form
> and a "Beyond your closet" panel into the results view is the next piece
> of frontend work — the API client functions for both
> (`aiApi.tagPhoto`, `aiApi.suggest` in `src/lib/apiClient.ts`) are already
> in place to build that UI against.

## Occasion planning (backend, optional)

Alongside destination trips, the backend supports planning for a single
event instead — engagement, wedding, Haldi/turmeric ceremony, Mehndi,
birthday party, business meeting, formal party, school program, airport day,
a long bus/train journey, a pool party, cafe hopping, a farewell/reunion,
and about 40 occasion types in total (`GET /events/occasion-types`), with
saved occasion plans stored the same way as saved trips
(`mode: "occasion"` in `POST /events`).

> **Status:** the occasion type catalog and the saved-plan storage are live
> on the backend. A destination-vs-occasion mode toggle on the trip form,
> and a single-outfit-plus-alternates generator for the occasion case (as
> opposed to a multi-day itinerary), are the next piece of frontend work.

## Folder structure

```
heygotchu/
├── server/                    Express + Prisma backend — see server/README.md
├── public/
│   └── favicon.svg
├── src/
│   ├── components/            All UI components (see below).
│   ├── context/
│   │   └── AuthContext.tsx    Signup/login/OTP/session state.
│   ├── data/
│   │   ├── sampleDestinations.ts  Curated data for Bali, Tokyo, Paris,
│   │   │                          Switzerland, New York, Dubai (palette,
│   │   │                          hero image, places, monthly climate).
│   │   └── seedCloset.ts     The "starter closet" demo wardrobe.
│   ├── lib/
│   │   ├── apiClient.ts      Typed fetch client for the backend (auth,
│   │   │                     closet, preferences, events, AI).
│   │   ├── apiConfig.ts      VITE_API_URL resolution.
│   │   ├── weatherApi.ts     Open-Meteo geocoding + forecast, plus a
│   │   │                     climate-based estimator for dates outside the
│   │   │                     ~15 day forecast window.
│   │   ├── imageApi.ts       Destination image abstraction (see below).
│   │   ├── vibeCopy.ts       "Travel Vibe" description abstraction.
│   │   ├── colorPalette.ts   Destination color palette generator.
│   │   ├── outfitGenerator.ts  The core wardrobe-matching algorithm,
│   │   │                     including hard coverage rules, the Hijabi
│   │   │                     tier, and the "More Coverage" soft bias.
│   │   ├── buildTripPlan.ts  Orchestrates the above into a TripPlan.
│   │   ├── imageResize.ts    Downscales uploaded clothing photos.
│   │   ├── fetchWithTimeout.ts  Bounds every external fetch so a slow/
│   │   │                     offline network always falls back gracefully.
│   │   └── dateUtils.ts, id.ts
│   ├── types/index.ts        Shared TypeScript types.
│   ├── App.tsx                View state + wiring.
│   └── main.tsx
├── .env.example
└── package.json
```

### Components

`AuthGate` (signup/login/OTP verification), `Navbar`, `TripForm` (composes
`DestinationSearch`, `DatePicker` ×2, `VibeSelector`, `GenerateButton`),
`LoadingScreen`, `ResultsView` (composes `ColorSwatch`/`PaletteStrip`,
`WeatherCard`, `Itinerary` → `DayOutfitCard`, `PackingList`,
`SaveTripButton`, `ShareButton`), `ClosetManager` (composes
`ClothingItemCard`, `AddClothingItemForm`, `Modal`), `ClothingPreferencesPanel`
("Preferences"), `SavedTripsPanel`, `EmptyState`, `Toast`.

## APIs & demo mode

Heygotchu uses an API abstraction layer so every external data source has a
real implementation *and* a graceful fallback — the app never breaks or
shows a blank state just because a key is missing or a network call fails
or times out.

| Data              | Live source                          | Needs a key? | Fallback when unavailable |
|-------------------|---------------------------------------|--------------|----------------------------|
| Geocoding         | Open-Meteo Geocoding API             | No           | Curated coordinates for the 6 sample destinations |
| Weather forecast  | Open-Meteo Forecast API              | No           | Seasonal climate estimate (curated monthly data for sample destinations, latitude-based heuristic otherwise) |
| Destination photo | Unsplash (via backend `/images`)     | Yes, optional| Curated photo for sample destinations, otherwise a deterministic stock photo per destination |
| "Travel Vibe" text| Claude (via backend `/vibe`)         | Yes, optional| Templated description built from destination, vibe, and weather |
| Photo auto-tagging| Claude (via backend `/ai/tag-photo`) | Yes, required| Add the item manually instead |
| Beyond-closet ideas| Claude (via backend `/ai/suggest`)  | Yes, required| Generator still works from your existing closet |

Weather works fully live with **zero configuration**. The photo/AI/Unsplash
integrations all live on the backend specifically so real API keys stay
server-side and are **never bundled into the frontend** — see
`server/README.md` for how to add them.

## Deploying

**Backend:** see "Deploying" in `server/README.md` (any Node host — Render,
Railway, Fly.io, a VPS).

**Frontend:** a static Vite build, deployable anywhere that serves static
files:

```bash
npm run build
# upload the dist/ folder, with VITE_API_URL set to your deployed backend's URL
```

## Notes

- Uploaded clothing photos are downscaled and sent to the backend as data
  URLs, stored alongside the rest of that item's data — scoped to your
  account like everything else.
- The old client-only `localStorage` architecture (and the Vercel-style
  `/api/*.js` functions it used for optional photo/AI integrations) has been
  fully replaced by the backend in `server/` — every account's closet,
  preferences, and saved plans now live there instead.
