# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

Primary (confirmed 02.11.2026): travellers abroad at a restaurant table. They can't read the menu, the waiter is waiting, and they want to order something good without guessing. Secondary: people eating out at home who want the best dish for long-term health.

Markets: United States (English) and Russian-speaking travellers (Russian), e.g. to Turkey, UAE, Georgia and Thailand.

## Product Purpose

Photograph any menu, in any language. Ordo translates every dish into the diner's language (English or Russian), keeps the printed name so they can point at it, says in one line what each dish is, ranks the dishes for long-term health with the best first, and gives a waiter card written in the menu's language. Success = the diner orders confidently within a minute of sitting down.

## Positioning

The only menu translator that also tells you what to order. Translators (Google Lens, Papago, DeepL) give words; health menu apps (MenuFit, Fig) give calorie numbers for chain restaurants from a database. Ordo reads the menu in front of you, with no restaurant database, and answers "what should I order here" in words, not numbers.

## Operating Context

Used one-handed at a restaurant table, often in bright or dim light, with a waiter present and sometimes poor connectivity. A scan takes up to ~30 s; dishes stream in live. The waiter card is shown across the table. The app also runs as a web PWA at ordo-one-green.vercel.app with the same UI.

## Capabilities and Constraints

- React + Vite, wrapped with Capacitor 8 for iOS (iPhone only). One Claude call per scan (api/scan.js on Vercel); deterministic scoring in src/lib/engine.js.
- App languages: English and Russian. Menus: any language.
- Features: sample menu on first launch, live streamed ranking, My needs (vegetarian, pescatarian, no pork, gluten-free, dairy-free, nut allergy), dish detail with swaps and "make it better" asks, waiter card, best-value pick, share card, scan history on device.
- Pricing: 3 free scans (lifetime), then one-time scan packs via StoreKit/RevenueCat. No subscription, no account.
- Rules: no calorie counts or health scores shown as numbers; never call a dish "safe" for an allergy; no restaurant database.

## Brand Commitments

- Name "Ordo". App Store name "Ordo: Menu Translator & Picks" (EN), «Ordo: переводчик меню» (RU).
- Exact free copy: "3 free scans" / «3 скана бесплатно».
- No AI / ИИ wording in Russian (and Uzbek) marketing.
- Icons: Lucide-style stroke SVG only, never emoji.
- Gold-ring app icon (assets/icon-only.png).

## Evidence on Hand

- Rival complaint research (02.11.2026): App Store low-star reviews of MenuFit, FoodieFit, Order Fit, CleanOrder, MenuPal and camera translators; Reddit travel threads (r/travel, r/JapanTravelTips, r/koreatravel, r/travelchina, r/taiwan).
- No testimonials, ratings or press yet (0 ratings). Do not fabricate any.

## Product Principles

1. Answer the table moment: translate, explain, rank, order, in that order of urgency.
2. Words, not numbers: verdicts and reasons a person can act on.
3. Honest by default: estimates labelled as estimates, allergies never declared safe, free scans stated exactly.
4. Try before paying: value is shown (sample menu, free scans) before any paywall.
5. The menu in front of you is the source of truth, not a database.

## Accessibility & Inclusion

Readable at arm's length across a table (waiter card), high contrast in bright and dim rooms; previously agreed floor: body text ≥9:1, secondary ≥12:1 on dark surfaces where possible. Full Russian localisation.
