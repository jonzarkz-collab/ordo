// Apple StoreKit via RevenueCat. Consumable credit packs only — there is no
// subscription product and no free trial anywhere in this app.
//
// Web builds never touch this module's native paths: the PWA stays free and
// unlimited, which also keeps us clear of Guideline 3.1.1 (an iOS build must
// never surface an external payment route).

import { Capacitor } from "@capacitor/core";

// Pack size lives here, keyed by product ID. Price does NOT: it comes from
// StoreKit at runtime as `priceString`, already localised and converted for the
// user's storefront. Hardcoding a price is how a paywall ends up promising
// $4.99 and charging ₸2,490 — the mismatch FlipVerdict shipped and had to fix.
export const PACKS = {
  ordo_scans_25: 25,
  ordo_scans_100: 100,
};

export const isNative = () => Capacitor.isNativePlatform();

let configured = false;
let Purchases = null;

async function sdk() {
  if (!Purchases) {
    ({ Purchases } = await import("@revenuecat/purchases-capacitor"));
  }
  return Purchases;
}

/** Safe to call repeatedly; a no-op on web or without a key. */
export async function initPurchases() {
  if (configured || !isNative()) return false;
  const apiKey = import.meta.env.VITE_RC_IOS_KEY;
  if (!apiKey) {
    console.warn("[ordo] VITE_RC_IOS_KEY missing — packs unavailable.");
    return false;
  }
  const P = await sdk();
  await P.configure({ apiKey });
  configured = true;
  return true;
}

/**
 * Lifetime credits the store says this user has bought.
 *
 * Deriving the grant from the store rather than from local storage is what
 * makes a reinstall safe. There are no accounts in this app, so a device wipe
 * would otherwise erase paid credits — and "I paid and lost it" is precisely
 * the complaint class that sinks these apps. RevenueCat keeps consumable
 * transactions against the anonymous app user ID, so a restore brings the full
 * grant back. Spend is tracked locally, so a restore is mildly generous rather
 * than punishing. That is the correct direction to err.
 */
export async function grantedCredits() {
  if (!configured) return 0;
  try {
    const P = await sdk();
    const { customerInfo } = await P.getCustomerInfo();
    return sumGrant(customerInfo);
  } catch (e) {
    console.warn("[ordo] getCustomerInfo failed", e);
    return 0;
  }
}

function sumGrant(customerInfo) {
  const txns = customerInfo?.nonSubscriptionTransactions || [];
  return txns.reduce((n, t) => n + (PACKS[t.productIdentifier] || 0), 0);
}

/**
 * Purchasable packs, cheapest first, with StoreKit's own localised price.
 * Returns [] when the store is unreachable so the caller can show a plain
 * "unavailable" state instead of a broken paywall.
 */
export async function listPacks() {
  if (!configured) return [];
  try {
    const P = await sdk();
    const { current } = await P.getOfferings();
    const pkgs = current?.availablePackages || [];
    return pkgs
      .filter((p) => PACKS[p.product.identifier])
      .map((p) => ({
        pkg: p,
        productId: p.product.identifier,
        credits: PACKS[p.product.identifier],
        priceString: p.product.priceString,
        price: p.product.price,
      }))
      .sort((a, b) => a.price - b.price);
  } catch (e) {
    console.warn("[ordo] getOfferings failed", e);
    return [];
  }
}

/** Returns the new lifetime grant, or null if the user cancelled. */
export async function buyPack(pack) {
  const P = await sdk();
  try {
    const { customerInfo } = await P.purchasePackage({ aPackage: pack.pkg });
    return sumGrant(customerInfo);
  } catch (e) {
    // RevenueCat reports a user-initiated cancel as an error; that is a normal
    // outcome, not a failure to report.
    if (e?.code === "1" || e?.userCancelled || /cancel/i.test(e?.message || "")) {
      return null;
    }
    throw e;
  }
}

/** Apple requires a visible restore control wherever purchases are offered. */
export async function restorePurchases() {
  const P = await sdk();
  const { customerInfo } = await P.restorePurchases();
  return sumGrant(customerInfo);
}
