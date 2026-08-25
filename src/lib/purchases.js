// Apple StoreKit via RevenueCat. Consumable credit packs only — there is no
// subscription product and no free trial anywhere in this app.
//
// Web builds never touch this module's native paths: the PWA stays free and
// unlimited, which also keeps us clear of Guideline 3.1.1 (an iOS build must
// never surface an external payment route).

import { Capacitor } from "@capacitor/core";
// STATIC import, deliberately. This was `await import(...)` inside sdk(), which
// Vite code-splits into a separate chunk fetched at runtime. Inside the iOS
// WKWebView that fetch never settled: the await hung forever, neither resolving
// nor rejecting, so there was nothing to catch and the paywall sat empty with
// step=importing-sdk. A static import puts the module in the main bundle, so
// there is no runtime chunk fetch left to hang on.
//
// Safe on web: importing this module only registers a plugin proxy, it does not
// call anything native. Every native call is still gated behind isNative().
import { Purchases } from "@revenuecat/purchases-capacitor";

// Pack size lives here, keyed by product ID. Price does NOT: it comes from
// StoreKit at runtime as `priceString`, already localised and converted for the
// user's storefront. Hardcoding a price is how a paywall ends up promising
// $4.99 and charging ₸2,490 — the mismatch FlipVerdict shipped and had to fix.
// Sizes only. The 50-pack must stay better value per scan than the 25 — a
// second tier that costs the same per unit gives nobody a reason to pick it.
// Intended App Store prices: $4.99 (20.0c/scan) and $7.99 (16.0c/scan).
export const PACKS = {
  ordo_scans_25: 25,
  ordo_scans_50: 50,
};

export const isNative = () => Capacitor.isNativePlatform();

let configured = false;

/**
 * Why this exists: there is no Mac in this project, so no Safari Web Inspector
 * and no console on device. When the paywall came up empty in TestFlight we had
 * to *infer* the cause from RevenueCat's dashboard and guessed twice. This
 * records what actually happened so the paywall can show it instead.
 *
 * `rawProductIds` is the important one: it lists what the store returned BEFORE
 * the PACKS filter. If it comes back holding another app's products, the build
 * is carrying the wrong RevenueCat key — the single failure that looks
 * identical to a correct setup from both dashboards.
 *
 * Only the key PREFIX is kept. The iOS SDK key is public by design (it ships in
 * every copy of the binary), but a prefix is all that is needed to tell two
 * projects apart, so there is no reason to hold the rest.
 */
export const diag = {
  native: null,
  // Capacitor's own answer to "is the native plugin compiled into THIS
  // binary?". `cap ls` at build time only proves the CLI discovered the
  // package; this proves the bridge can actually reach it on the device. When
  // it is false, every call to the plugin hangs forever with no error, which
  // is the state four TestFlight builds were spent failing to explain.
  pluginAvailable: null,
  keyPrefix: null,
  // Which await we are sitting on, so a hang names its own location.
  step: "not-started",
  configured: false,
  configureError: null,
  offeringsError: null,
  currentOffering: null,
  rawProductIds: [],
};

// Bump on every diagnostic change. Codemagic caches the branch head and will
// happily rebuild an old commit, so "I tested the new build" has twice meant
// testing the old one. If this string is not on screen, the build is stale and
// nothing else in the readout can be trusted.
const DIAG_BUILD = "diag5";

export function diagText() {
  const d = diag;
  return [
    `build=${DIAG_BUILD}`,
    `native=${d.native}`,
    `plugin=${d.pluginAvailable}`,
    `key=${d.keyPrefix || "MISSING"}`,
    `step=${d.step}`,
    `configured=${d.configured}`,
    d.configureError ? `configureErr=${d.configureError}` : null,
    d.offeringsError ? `offeringsErr=${d.offeringsError}` : null,
    `offering=${d.currentOffering ?? "null"}`,
    `products=[${d.rawProductIds.join(", ") || "none"}]`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Kept as a function so the call sites below read unchanged, but it no longer
 * loads anything — the module is imported statically at the top of the file.
 * It now only asserts the import actually produced a usable object, so a
 * packaging failure is reported instead of surfacing later as a null deref.
 */
function sdk() {
  if (!Purchases) throw new Error("purchases-capacitor module did not load");
  return Purchases;
}

/** Safe to call repeatedly; a no-op on web or without a key. */
export async function initPurchases() {
  diag.native = isNative();
  if (!isNative()) return false;
  diag.pluginAvailable = Capacitor.isPluginAvailable("Purchases");
  // Already configured is SUCCESS, not failure. Returning false here made the
  // caller's `if (!ok) return` bail out before listPacks() on any second call,
  // which would show an empty paywall on a correctly configured store.
  if (configured) return true;
  const apiKey = import.meta.env.VITE_RC_IOS_KEY;
  diag.keyPrefix = apiKey ? String(apiKey).slice(0, 12) + "…" : null;
  if (!apiKey) {
    console.warn("[ordo] VITE_RC_IOS_KEY missing — packs unavailable.");
    return false;
  }
  try {
    // No longer an import — the module is already in the bundle. Kept as a
    // distinct step so the readout still distinguishes "module missing" from
    // "configure hung".
    diag.step = "resolving-sdk";
    const P = sdk();
    diag.step = "configuring";
    // A Capacitor bridge call to a plugin that is not in the binary never
    // resolves AND never rejects — nothing to catch, nothing logged, the
    // paywall just stays empty forever. Race it so a hang becomes a visible
    // failure instead of silence.
    await Promise.race([
      P.configure({ apiKey }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("configure() never returned after 10s")),
          10000
        )
      ),
    ]);
    diag.step = "configured";
  } catch (e) {
    // Previously this threw out of the calling effect and vanished — the app
    // just showed an empty paywall with no way to find out why.
    diag.configureError = String(e?.message || e);
    console.warn("[ordo] configure failed", e);
    return false;
  }
  configured = true;
  diag.configured = true;
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
    const P = sdk();
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
    const P = sdk();
    const { current } = await P.getOfferings();
    const pkgs = current?.availablePackages || [];
    diag.currentOffering = current?.identifier ?? null;
    // Before the filter — this is what actually tells the two failure modes
    // apart: an empty list means StoreKit returned nothing, while a list of
    // some OTHER app's products means the build carries the wrong key.
    diag.rawProductIds = pkgs.map((p) => p?.product?.identifier).filter(Boolean);
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
    diag.offeringsError = String(e?.message || e);
    console.warn("[ordo] getOfferings failed", e);
    return [];
  }
}

/** Returns the new lifetime grant, or null if the user cancelled. */
export async function buyPack(pack) {
  const P = sdk();
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
  const P = sdk();
  const { customerInfo } = await P.restorePurchases();
  return sumGrant(customerInfo);
}
