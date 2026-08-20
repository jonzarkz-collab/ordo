# Ordo: Longevity Menu Ranking

Photograph a restaurant menu; every dish comes back ranked for long-term health,
with waiter-ready asks to improve the one you want.

Live PWA: <https://ordo-one-green.vercel.app>
App Store: `com.zafarjon.ordo` · Apple ID `6802338296`

## How it works

One Claude call per scan (`api/scan.js`) extracts **facts only** — ingredients,
cooking method, processing flags. A deterministic engine (`src/lib/engine.js`)
turns those facts into the ranking. The engine is shared by client and server,
so the "make it better" toggles recalculate live and identically.

Two rules the design will not break:

- **The internal 0–100 score is never displayed.** Users see a tier and the
  facts behind it. A number on screen is a claim users check and argue with —
  across 341 negative reviews of rival menu apps, disputes over a displayed
  figure were the single largest accuracy complaint.
- **No subscription, no free trial, nothing auto-renewing.** Three free scans,
  once, then one-time credit packs. Billing grievances outnumbered product
  complaints roughly two to one in that same review set. The allowance is
  lifetime rather than daily because eating out is episodic — a daily quota
  would hand a moderate diner ~90 free scans a month against a real need of two
  to eight, putting the paywall permanently out of reach.

## Layout

| Path | What |
|---|---|
| `api/scan.js` | Vercel function — Claude call, rate limit, optional KV cache |
| `src/lib/engine.js` | Deterministic scoring, tiers, improvements, EN/RU labels |
| `src/lib/credits.js` | Lifetime free allowance + paid credit balance |
| `src/lib/purchases.js` | StoreKit consumables via RevenueCat |
| `src/App.jsx` | All four screens: home → processing → results → detail |
| `codemagic.yaml` | iOS build → TestFlight |

## Build

```
npm install
npm run dev          # local
npm run build        # production bundle
node gen_icons.js    # regenerate icons incl. the 1024 iOS master
```

## iOS

No Mac required. `ios/` is **not** committed — Codemagic runs `npx cap add ios`
on every build, which is why the Info.plist permission strings are injected by a
build step rather than edited by hand.

Codemagic needs:

- an environment group `ordo_secrets` containing `VITE_RC_IOS_KEY`
- `CERTIFICATE_PRIVATE_KEY` (reuse the existing one — Apple allows only 3
  distribution certificates per account)

`VITE_API_BASE` is set in `codemagic.yaml`. It must point at the deployed
backend: under Capacitor the page origin is `capacitor://localhost`, so a
same-origin `/api/scan` resolves to the app bundle and 404s silently at runtime.
The build fails loudly if that value is missing from the bundle.
