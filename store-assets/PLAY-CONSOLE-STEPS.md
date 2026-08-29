# Publishing Heygotchu to Google Play — step by step

Everything you need is prepared:
- **App bundle:** `C:\Users\Muzaid\Desktop\heygotchu-android\app-release-bundle.aab`
- **Signing key:** `heygotchu-keystore.jks` + `KEYSTORE-INFO.txt` (same folder) — BACK THESE UP (e.g. a private cloud drive). Losing them = never updating the app again.
- **Icon & feature graphic:** `heygotchu\store-assets\`
- **Listing text & data-safety answers:** `store-assets\LISTING.md`
- **Privacy policy:** https://heygotchu.com/privacy.html (live)

## Steps in play.google.com/console

1. **Create app** → name `Heygotchu`, default language English, App (not game), Free → agree → Create.
2. **Set up your app** (the checklist on the dashboard):
   - Privacy policy → paste https://heygotchu.com/privacy.html
   - App access → "All functionality is available without special access"? NO — accounts exist. Choose "All or some functionality is restricted" → add credentials for reviewers: create a test account first in the app (e.g. reviewer@heygotchu.com / a password you set) and enter it here.
   - Ads → No ads
   - Content rating → fill questionnaire (Everyone; no sensitive content)
   - Target audience → 18+ (simplest) or 13+; NOT designed for children
   - News app → No
   - Data safety → copy answers from LISTING.md
   - Government app → No
3. **Store listing** (Grow → Store presence → Main store listing):
   - Short + full description from LISTING.md
   - App icon: upload `play-icon-512.png`
   - Feature graphic: upload `feature-graphic.png`
   - Phone screenshots: at least 2 (take from your phone: login video, closet, occasion outfits, trip plan)
4. **Upload the app** (Test and release → Testing → **Internal testing**):
   - Create new release → upload `app-release-bundle.aab`
   - When asked about **Play App Signing**, accept (Google manages the store key; your .jks stays the upload key)
   - Release name auto-fills; release notes: "First release 🎉" → Save → Review → Start rollout
5. **Add testers** (Internal testing → Testers tab):
   - Create an email list with the family's Gmail addresses
   - Copy the **opt-in link** and send it to everyone — they tap it once, then Heygotchu appears for them **in the Play Store app** to install like any app.

## Notes
- Internal testing is live within minutes (no review wait) and supports up to 100 testers — perfect for family use indefinitely.
- A public production release later requires Google's closed-testing period for new personal accounts (12 testers, 14 days) — do it whenever you want the app public.
- App updates later: I bump the version, rebuild the .aab, you upload it to the same track.
- IMPORTANT: after Play App Signing is enabled, come back to me with the "App signing key certificate" SHA-256 shown in Console → Setup → App signing — I must add it to heygotchu.com's assetlinks.json so the installed app runs full-screen without a browser bar.
