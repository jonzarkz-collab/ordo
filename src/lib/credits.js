// Three free scans, once, then one-time credit packs. No subscription, no free
// trial, no auto-renew — deliberately.
//
// That choice came out of coding 341 one-to-three-star reviews of the menu-app
// competitors (see ORDO-COMPETITOR-INTEL.md). Billing complaints outweighed
// product complaints roughly two to one: 86 about free trials, 82 about being
// charged or chasing refunds, 49 about cancellation, 41 about there being no
// free tier at all. Every one of those is a self-inflicted wound from the
// trial-into-subscription pattern. We skip the pattern entirely.
//
// LIFETIME, not daily. This started as three scans a *day*, which was a
// miscalibration: eating out is episodic, not daily. Market research on the
// category found churn attributed directly to frequency —
//   "I thought the app was decent but don't want to pay for it as I don't eat
//    out very often."
// — while the paying user is the opposite profile: "anyone who eats out a lot."
// A daily allowance hands a moderate diner ~90 free scans a month against a
// real need of two to eight, so the paywall is never reached and nobody
// converts. A refill on any schedule has the same defect in slower motion.
//
// Three scans, once, is enough to prove the app works on real menus, and a
// 25-scan pack is a small price against the thing the user already cares about.
// Nothing here expires and nothing renews, so the honesty claim survives: the
// user pays once, or not at all.
//
// Tuning note: FREE_SCANS is the single number setting the free/paid boundary.

export const FREE_SCANS = 3;

// v2: the stored shape changed from { day, used } to a plain used-count, and
// the allowance is no longer periodic. Ordo has never shipped, so there is
// nothing to migrate — the bump just keeps the two shapes from being confused.
const FREE_USED_KEY = "ordo_free_used_v2";
const USED_KEY = "ordo_credits_used_v1";

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — quota degrades to per-session, which is acceptable */
  }
}

/** Free scans consumed so far. Never resets. */
export function freeUsed() {
  return read(FREE_USED_KEY, 0) || 0;
}

export function freeLeft() {
  return Math.max(0, FREE_SCANS - freeUsed());
}

/** Paid credits already spent. Granted credits come from RevenueCat. */
export function creditsUsed() {
  return read(USED_KEY, 0) || 0;
}

export function creditsLeft(granted) {
  return Math.max(0, (granted || 0) - creditsUsed());
}

/**
 * What the user can do right now.
 * `granted` is the lifetime pack total reported by the store (see purchases.js).
 */
export function entitlement(granted) {
  const free = freeLeft();
  const paid = creditsLeft(granted);
  return { free, paid, total: free + paid, canScan: free + paid > 0 };
}

/**
 * Spend one scan. The free allowance is always consumed first so that purchased
 * credits keep their value — a user who buys a pack should not watch it drain
 * while free scans sit unused.
 * Returns true if a scan was available and has been deducted.
 */
export function consumeScan(granted) {
  if (freeLeft() > 0) {
    write(FREE_USED_KEY, freeUsed() + 1);
    return true;
  }
  if (creditsLeft(granted) > 0) {
    write(USED_KEY, creditsUsed() + 1);
    return true;
  }
  return false;
}
