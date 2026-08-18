// Free daily scans + one-time credit packs. No subscription, no free trial,
// no auto-renew — deliberately.
//
// That choice came out of coding 341 one-to-three-star reviews of the menu-app
// competitors (see ORDO-COMPETITOR-INTEL.md). Billing complaints outweighed
// product complaints roughly two to one: 86 about free trials, 82 about being
// charged or chasing refunds, 49 about cancellation, 41 about there being no
// free tier at all. Every one of those is a self-inflicted wound from the
// trial-into-subscription pattern. We skip the pattern entirely.
//
// The free tier has to be genuinely useful forever, not a teaser: three scans a
// day comfortably covers real restaurant use, so a diner never hits the wall on
// an ordinary evening out.

export const FREE_PER_DAY = 3;

const QUOTA_KEY = "ordo_quota_v1";
const USED_KEY = "ordo_credits_used_v1";

function today() {
  // Local date, not UTC — the quota should roll over at the diner's midnight.
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

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

/** Free scans used today, resetting automatically at local midnight. */
export function freeUsedToday() {
  const q = read(QUOTA_KEY, null);
  if (!q || q.day !== today()) return 0;
  return q.used || 0;
}

export function freeLeftToday() {
  return Math.max(0, FREE_PER_DAY - freeUsedToday());
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
  const free = freeLeftToday();
  const paid = creditsLeft(granted);
  return { free, paid, total: free + paid, canScan: free + paid > 0 };
}

/**
 * Spend one scan. Free allowance is always consumed first so that purchased
 * credits keep their value — a user who buys a pack should not watch it drain
 * while today's free scans sit unused.
 * Returns true if a scan was available and has been deducted.
 */
export function consumeScan(granted) {
  const free = freeLeftToday();
  if (free > 0) {
    write(QUOTA_KEY, { day: today(), used: freeUsedToday() + 1 });
    return true;
  }
  if (creditsLeft(granted) > 0) {
    write(USED_KEY, creditsUsed() + 1);
    return true;
  }
  return false;
}
