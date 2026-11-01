import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  compressImage,
  scanMenu,
  loadHistory,
  saveToHistory,
  hashInput,
  findCached,
  getBetterOrders,
  recordBetterOrder,
} from "./lib/api.js";
import {
  computeScore,
  tierFor,
  applyMods,
  localizedTier,
  processingLabel,
  scriptLines,
  bestValue,
  rankDishes,
  LOCALES,
} from "./lib/engine.js";
import { UI, getLang, saveLang } from "./lib/i18n.js";
import { demoResult, demoMenuLines, DEMO_RESTAURANT } from "./demo.js";
import {
  NEEDS,
  conflicts,
  fitDishes,
  allergyGroups,
  loadNeeds,
  saveNeeds,
} from "./lib/needs.js";
import {
  FREE_SCANS,
  entitlement,
  consumeScan,
  ensureBaseline,
  resetLocalState,
} from "./lib/credits.js";
import {
  isNative,
  initPurchases,
  grantedCredits,
  listPacks,
  buyPack,
  diagText,
} from "./lib/purchases.js";
import {
  CameraIcon,
  SparkIcon,
  LeafIcon,
  FlameIcon,
  LayersIcon,
  TagIcon,
  CheckIcon,
  AlertIcon,
  ReceiptIcon,
  BoltIcon,
  ChevronIcon,
  ChevronDownIcon,
  EmblemIcon,
  BanknoteIcon,
  Medal,
  TierDot,
  ShareIcon,
} from "./lib/icons.jsx";
import { drawShareCard, shareImage, shareLink } from "./lib/shareCard.js";

export default function App() {
  const [screen, setScreen] = useState("home"); // home | processing | results | detail
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(loadHistory());
  const [orders, setOrders] = useState(getBetterOrders());
  const [lang, setLang] = useState(getLang());
  const t = UI[lang] || UI.en;
  // Live ranking: raw dish facts as the server streams them, plus the photo
  // being read, so the wait shows the menu and the ranking building on it.
  const [live, setLive] = useState([]);
  const [scanPhoto, setScanPhoto] = useState(null);
  // Diet/allergy needs: chips on the ranking, saved on this device, applied to
  // every menu from then on (lib/needs.js).
  const [needs, setNeeds] = useState(loadNeeds);

  function toggleNeed(id) {
    setNeeds((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      saveNeeds(next);
      return next;
    });
  }

  // Scan budget. Only the native build meters anything — the web PWA stays
  // free and unlimited, which keeps it useful as a funnel and keeps the iOS
  // build free of any external payment route (Guideline 3.1.1).
  // `?metered=1` forces the metered UI on in a desktop browser so the quota and
  // paywall can be inspected without a Mac or a device. import.meta.env.DEV is
  // false in `npm run build`, so this whole branch is stripped from anything
  // that ships.
  const metered =
    isNative() ||
    (import.meta.env.DEV &&
      new URLSearchParams(window.location.search).has("metered"));
  const [granted, setGranted] = useState(0);
  const [packs, setPacks] = useState([]);
  const [paywall, setPaywall] = useState(false);
  const [budget, setBudget] = useState(() => entitlement(0));

  const refreshBudget = (g = granted) => setBudget(entitlement(g));

  useEffect(() => {
    if (!metered) return;
    (async () => {
      const ok = await initPurchases();
      if (!ok) return;
      const g = await grantedCredits();
      // null means the store did not answer. Anchoring the baseline on that
      // would treat "unknown" as "no purchases" and later grant the user their
      // entire Apple ID purchase history for free.
      if (g !== null) {
        ensureBaseline(g);
        setGranted(g);
        setBudget(entitlement(g));
      }
      setPacks(await listPacks());
    })();
  }, [metered]);

  // The file input lives here, not in Home, so the sample ranking's "Scan your
  // menu" bar can open the same picker without routing back through Home.
  const fileRef = useRef(null);

  // Gate before the photo picker, not after. Making someone frame a menu and
  // only then telling them they're out of scans is the small cruelty that
  // earns a one-star review.
  function startScan() {
    if (metered && !entitlement(granted).canScan) setPaywall(true);
    else fileRef.current?.click();
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const image = await compressImage(file);
      analyze({ image });
    } catch (err) {
      alert(err.message);
    }
  }

  // The sample menu: ranked on-device by the same engine, free, and never
  // saved to history or charged. It exists so a first run has something to do
  // before there is a menu in hand.
  function openDemo() {
    setResult(demoResult(lang));
    setScreen("results");
  }

  function changeLang(l) {
    setLang(l);
    saveLang(l);
  }

  async function analyze(payload) {
    setError("");
    // Menu Memory (device): an identical input we've seen before is instant —
    // and free. Re-opening a menu you already scanned costs nothing, because no
    // analysis actually runs.
    const hash = await hashInput(payload, lang);
    const hit = findCached(hash);
    if (hit) {
      setResult({ ...hit.result, cached: true });
      setScreen("results");
      return;
    }
    if (metered && !entitlement(granted).canScan) {
      setPaywall(true);
      return;
    }
    setLive([]);
    setScanPhoto(
      payload.image ? `data:${payload.image.media_type};base64,${payload.image.data}` : null
    );
    setScreen("processing");
    try {
      const data = await scanMenu({ ...payload, lang }, (d) =>
        setLive((l) => [...l, d])
      );
      // Charged only on success. A timeout or a server error must never cost
      // the diner a scan — they are standing in a restaurant waiting on us.
      if (metered) {
        consumeScan(granted);
        refreshBudget();
      }
      setResult(data);
      saveToHistory(data, hash);
      setHistory(loadHistory());
      setScreen("results");
    } catch (e) {
      const timedOut = e.status === 504 || e.status === 502 || e.status === 524;
      setError(timedOut ? t.timeoutError : e.message);
      setScreen("home");
    }
  }

  /**
   * Returns how many scans this purchase ADDED, or null if the user cancelled.
   *
   * The delta matters: `buyPack` reports the LIFETIME pack total from the
   * store, not this purchase. A user on their second 25-pack correctly jumps
   * from 25 to 50, but with no feedback that reads as "I bought 25 and got 50"
   * — which is exactly how it was first reported as a billing bug. Closing the
   * paywall is left to the caller so the confirmation is visible first.
   */
  async function onBuy(pack) {
    const before = granted;
    const g = await buyPack(pack);
    if (g === null) return null; // user cancelled — not an error
    setGranted(g);
    refreshBudget(g);
    return Math.max(0, g - before);
  }

  // onRestore() was removed with the restore button — see lib/purchases.js for
  // why (Guideline 3.1.1: consumables cannot be restored via the Apple Account).

  function openDish(dish) {
    setSelected(dish);
    setScreen("detail");
  }

  function openHistory(entry) {
    setResult({ ...entry.result, cached: true });
    setScreen("results");
  }

  function onOrdered(next) {
    setOrders(next);
  }

  return (
    <div className="app">
      {/* No `capture` attr: iOS offers Take Photo OR Photo Library, so
          delivery-app screenshots work through the same single button. */}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      {screen === "home" && (
        <Home
          onScan={startScan}
          onDemo={openDemo}
          error={error}
          history={history}
          onHistory={openHistory}
          orders={orders}
          t={t}
          lang={lang}
          onLang={changeLang}
          metered={metered}
          budget={budget}
          onPaywall={() => setPaywall(true)}
        />
      )}
      {screen === "processing" && (
        <Processing t={t} lang={lang} live={live} photo={scanPhoto} needs={needs} />
      )}
      {screen === "results" && result && (
        <Results
          result={result}
          onBack={() => setScreen("home")}
          onOpen={openDish}
          onScan={startScan}
          needs={needs}
          onNeed={toggleNeed}
          t={t}
          lang={lang}
        />
      )}
      {screen === "detail" && selected && (
        <Detail
          key={`${selected.rank}-${selected.name}`}
          dish={selected}
          // Swaps come only from dishes that fit, so "Better on this menu"
          // never suggests the pork dish to someone who just ruled pork out.
          allDishes={result ? fitDishes(result.dishes, needs).fit : []}
          needs={needs}
          onSwap={openDish}
          onBack={() => setScreen("results")}
          onOrdered={onOrdered}
          restaurant={result?.restaurant || t.thisMenu}
          demo={!!result?.demo}
          onScan={startScan}
          t={t}
          lang={lang}
        />
      )}
      {paywall && (
        <Paywall
          packs={packs}
          budget={budget}
          onBuy={onBuy}
          onClose={() => setPaywall(false)}
          t={t}
        />
      )}
    </div>
  );
}

/* ---------------- Home ---------------- */

function Home({
  onScan,
  onDemo,
  error,
  history,
  onHistory,
  orders,
  t,
  lang,
  onLang,
  metered,
  budget,
  onPaywall,
}) {
  const [allHist, setAllHist] = useState(false);
  // First run = nothing scanned yet. The sample menu takes the hero spot until
  // the first real scan, then the home screen goes back to one action.
  const firstRun = history.length === 0;

  // Seven taps on the scan counter wipes local counters and reloads. See
  // resetLocalState() for why this has to exist: Apple's purchase receipt is
  // permanent, so once a sandbox Apple ID has bought packs there is no other
  // route back to a clean first-run state for a review recording.
  const resetTaps = useRef(0);
  const resetTimer = useRef(null);

  function bumpResetTaps() {
    resetTaps.current += 1;
    clearTimeout(resetTimer.current);
    // Taps must be consecutive; a stray tap decays instead of accumulating
    // across a whole session.
    resetTimer.current = setTimeout(() => { resetTaps.current = 0; }, 2500);
    if (resetTaps.current >= 7) {
      resetTaps.current = 0;
      clearTimeout(resetTimer.current);
      resetLocalState();
      // Full reload so the baseline re-anchors from the store on next boot.
      window.location.reload();
    }
  }

  return (
    <div className="screen home">
      {/* One hero action. The Better Orders count used to appear twice on this
          screen — a corner chip here and the full line below — which is how a
          deliberately single-purpose home screen drifts back to ten elements.
          The line at the bottom says the same thing in words. */}
      <div className="top-row">
        <div className="lang-toggle">
          <button className={lang === "en" ? "on" : ""} onClick={() => onLang("en")}>
            EN
          </button>
          <button className={lang === "ru" ? "on" : ""} onClick={() => onLang("ru")}>
            РУ
          </button>
        </div>
      </div>
      <header className={`brand ${firstRun ? "first-run" : ""}`}>
        {/* The glass hero tile. Decorative; the logo below stays the brand.
            On a first run the sample menu below takes its place. */}
        {!firstRun && (
          <div className="og-emblem" aria-hidden="true">
            <EmblemIcon size={58} />
          </div>
        )}
        {/* Seven taps on the logo wipes the local counters and reloads.
            It lives HERE, not on the scan counter: that button opens the
            paywall on the first tap, and the overlay then covers it, so taps
            two onward never reach the handler. The logo has no other action,
            so the gesture can actually complete. */}
        <div className="logo" onPointerDown={bumpResetTaps}>
          ORD<span className="logo-o">O</span>
        </div>
        <p className="tagline">{t.tagline}</p>
        {!firstRun && <p className="subtitle">{t.subtitle}</p>}
      </header>

      {firstRun && <SampleMenu t={t} lang={lang} onDemo={onDemo} />}

      {error && <div className="error-box">{error}</div>}

      <div className="actions">
        <button className="btn primary big-scan" onClick={onScan}>
          <CameraIcon size={22} />
          {t.scan}
        </button>
        {metered && (
          <button
            className="scan-budget"
            onClick={onPaywall}
          >
            {budget.paid > 0
              ? t.scansLeft(budget.total)
              : t.freeLeft(budget.free)}
          </button>
        )}
      </div>

      {history.length > 0 && (
        <div className="history">
          <h3>{t.recent}</h3>
          <div className="history-list">
            {(allHist ? history : history.slice(0, 3)).map((h) => (
              <button key={h.ts} className="history-item" onClick={() => onHistory(h)}>
                <span className="history-title">{h.title}</span>
                <span className="history-sub">{h.top}</span>
                <span className="history-date">{new Date(h.ts).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
          {history.length > 3 && (
            <button className="hist-more" onClick={() => setAllHist(!allHist)}>
              {allHist ? t.hide : t.allScans(history.length)}
            </button>
          )}
        </div>
      )}

      {orders.count > 0 && (
        <p className="orders-line">
          <LeafIcon size={14} />
          {t.betterOrders(orders.count)}
          {orders.last ? ` · ${t.lastPick(orders.last.name)}` : ""}
        </p>
      )}

      <footer className="disclaimer">{t.disclaimer}</footer>
    </div>
  );
}

/* ---------------- Sample menu (first run) ----------------
   A printed menu on the table with Ordo's scan line passing over it. Tapping
   it "scans" in place (each line gets its tier dot, the winner lights up) and
   then opens the real ranking screen for that menu. The point is to show the
   product working in the first five seconds, before anyone has to find a menu
   or spend a scan. */

function SampleMenu({ t, lang, onDemo }) {
  const [phase, setPhase] = useState("idle"); // idle | reading
  const lines = demoMenuLines(lang).slice(0, 6);

  function go() {
    if (phase !== "idle") return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setPhase("reading");
    // The dots land one line at a time; the ranking opens once the last one
    // is down and the winner has had a beat to glow.
    setTimeout(onDemo, still ? 250 : 1700);
  }

  return (
    <button className={`sample-menu ${phase}`} onClick={go}>
      <span className="paper" aria-hidden="true">
        <span className="paper-name">{DEMO_RESTAURANT}</span>
        <span className="paper-kind">{t.sampleKind}</span>
        <span className="paper-lines">
          {lines.map((l, i) => (
            <span
              key={l.name}
              className={`paper-line ${l.rank === 1 ? "winner" : ""}`}
              style={{ "--i": i, "--ink": TIER_DOT[l.tier.key] || l.tier.color }}
            >
              <span className="paper-dot" />
              <span className="paper-dish">{l.name}</span>
              <span className="paper-lead" />
              <span className="paper-price">{l.price}</span>
            </span>
          ))}
        </span>
        <span className="scan-beam" />
      </span>
      <span className="sample-cta">
        <SparkIcon size={15} />
        {phase === "idle" ? t.sampleTry : t.sampleReading}
      </span>
    </button>
  );
}

// Tier inks for dots on cream paper. TIER_INK is tuned for the dark glass and
// washes out on white, so the paper gets the deeper engine-side tones.
const TIER_DOT = {
  excellent: "#16A36B",
  good: "#9AA824",
  fair: "#D9930B",
  poor: "#D9573A",
  splurge: "#8A979D",
};

/* ---------------- Paywall ---------------- */

// Consumable packs only. Anywhere purchases are offered we show each product's
// title, its price as StoreKit reports it, and links to the Terms and Privacy
// Policy. There is deliberately no auto-renewal disclosure because nothing
// renews — that is the whole point of the model — and deliberately NO restore
// control: the restore requirement covers non-consumables and subscriptions,
// and offering one for consumables is what Apple rejected under 3.1.1.
const APPLE_EULA =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const PRIVACY_URL = "https://ordo-one-green.vercel.app/privacy.html";

function Paywall({ packs, budget, onBuy, onClose, t }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  // The store diagnostic must not ship visible to App Review — a reviewer whose
  // sandbox hiccups would see raw debug text and read the build as unfinished.
  // But it cannot simply be deleted either: there is no Mac and no device
  // console, so it is the only way to read a store failure on real hardware.
  // Compromise: five taps on the title reveals it, and the choice persists, so
  // a future broken build is still diagnosable without shipping debug UI.
  const [taps, setTaps] = useState(0);
  const [showDiag, setShowDiag] = useState(
    () => {
      try { return localStorage.getItem("ordo_diag") === "1"; } catch { return false; }
    }
  );

  function tapTitle() {
    const n = taps + 1;
    setTaps(n);
    if (n >= 5) {
      setTaps(0);
      setShowDiag((was) => {
        const next = !was;
        try { localStorage.setItem("ordo_diag", next ? "1" : "0"); } catch { /* private mode */ }
        return next;
      });
    }
  }

  async function buy(p) {
    setBusy(true);
    setNote("");
    try {
      const added = await onBuy(p);
      if (added === null) return; // cancelled — leave the paywall open
      // Confirm what this purchase added, then close. Without this the balance
      // just changes and the user cannot tell a correct total from a wrong one.
      setNote(t.creditsAdded(added));
      setTimeout(onClose, 1600);
    } catch {
      setNote(t.purchaseFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="script-overlay" onClick={onClose}>
      <div className="paywall-card" onClick={(e) => e.stopPropagation()}>
        <div className="og-tile" aria-hidden="true">
          <CameraIcon size={36} />
        </div>
        <h2 className="paywall-title" onClick={tapTitle}>{t.outTitle}</h2>
        <p className="paywall-sub">{t.outSub(FREE_SCANS)}</p>

        {packs.length === 0 ? (
          <>
            {/* Re-hidden now that the store works, as the earlier note said it
                must be before App Review. Users and reviewers see only the
                plain message; five taps on the title bring the diagnostic back
                if a future build breaks. */}
            <p className="paywall-empty">{t.packsUnavailable}</p>
            {showDiag && <pre className="paywall-diag">{diagText()}</pre>}
          </>
        ) : (
          <div className="pack-list">
            {packs.map((p) => (
              <button
                key={p.productId}
                className="pack"
                disabled={busy}
                onClick={() => buy(p)}
              >
                <span className="pack-credits">{t.packCredits(p.credits)}</span>
                {/* StoreKit's own localised string — never a hardcoded price. */}
                <span className="pack-price">{p.priceString}</span>
              </button>
            ))}
          </div>
        )}

        <p className="pack-note">{t.packNote}</p>
        <p className="pack-note strong">{t.noSubscription}</p>

        {note && <p className="paywall-note">{note}</p>}

        <div className="paywall-actions">
          <button className="btn ghost small" onClick={onClose}>
            {t.maybeLater}
          </button>
        </div>

        <p className="paywall-legal">
          <a href={APPLE_EULA} target="_blank" rel="noreferrer">
            {t.terms}
          </a>
          <span> · </span>
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
            {t.privacy}
          </a>
        </p>
      </div>
    </div>
  );
}

/* ---------------- Processing ---------------- */

// The 10-30 seconds a scan takes used to be a spinner. Now it is the diner's
// own menu with Ordo's scan line passing over it, and underneath, the ranking
// building itself: each dish lands as the model finishes it, ranked on-device
// by the same engine, and the list reshuffles as stronger dishes turn up. The
// wait becomes the product working in front of you.
function Processing({ t, lang, live, photo, needs }) {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLine((l) => (l + 1) % t.processing.length), 1600);
    return () => clearInterval(id);
  }, [t]);
  const ranked = live.length ? fitDishes(rankDishes(live, lang), needs).fit : [];
  const shown = ranked.slice(0, 5);
  return (
    <div className={`screen processing ${ranked.length ? "has-live" : ""}`}>
      {photo ? (
        <div className="scan-photo">
          <img src={photo} alt="" />
          <span className="scan-beam" aria-hidden="true" />
        </div>
      ) : (
        <div className="ring" />
      )}
      <p className="processing-line" aria-live="polite">
        {ranked.length ? t.liveFound(ranked.length) : t.processing[line]}
      </p>
      <p className="processing-hint">
        {ranked.length ? t.liveHint : t.processingHint}
      </p>
      {shown.length > 0 && <LiveBoard dishes={shown} lang={lang} />}
      {ranked.length > shown.length && (
        <p className="live-more">{t.liveMore(ranked.length - shown.length)}</p>
      )}
    </div>
  );
}

const liveKey = (d) => `${d.name}|${d.section}|${d.price}`;

// FLIP: measure where each row was, let React move it, then animate from the
// old spot to the new one, so a dish visibly climbs when it overtakes another.
function LiveBoard({ dishes, lang }) {
  const rows = useRef(new Map());
  const tops = useRef(new Map());
  useLayoutEffect(() => {
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const next = new Map();
    rows.current.forEach((el, key) => {
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      next.set(key, top);
      const was = tops.current.get(key);
      if (!still && was != null && Math.abs(was - top) > 1) {
        el.animate(
          [{ transform: `translateY(${was - top}px)` }, { transform: "none" }],
          { duration: 450, easing: "cubic-bezier(.2, .8, .2, 1)" }
        );
      }
    });
    tops.current = next;
  });
  return (
    <div className="live-board">
      {dishes.map((d) => {
        const key = liveKey(d);
        return (
          <div
            key={key}
            ref={(el) => (el ? rows.current.set(key, el) : rows.current.delete(key))}
            className={`live-row ${d.rank === 1 ? "leader" : ""}`}
          >
            <Medal rank={d.rank} />
            <span className="live-name">{d.name}</span>
            <TierChip tier={localizedTier(d.tier, lang)} />
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Results ---------------- */

function Results({ result, onBack, onOpen, onScan, needs, onNeed, t, lang }) {
  const [showAll, setShowAll] = useState(false);
  const [showMisfit, setShowMisfit] = useState(false);
  const share = useShare(t, lang);
  // Everything below ranks what the diner can actually eat. Dishes their
  // needs rule out drop to their own list at the bottom, not out of sight.
  const { fit: dishes, misfit } = fitDishes(result.dishes, needs);
  const podium = dishes.slice(0, 3);
  const rest = dishes.slice(3);
  const weakMenu = dishes.length > 0 && dishes[0].score < 65;
  // On the podium it becomes a badge on that card; further down the list it
  // gets its own card, so a budget diner never has to open "show all".
  const value = bestValue(dishes);

  return (
    <div className="screen results">
      <nav className="topbar">
        <button className="back" onClick={onBack}>
          <ChevronIcon size={18} />
          {t.newScan}
        </button>
        <span className="topbar-title">{result.restaurant || t.thisMenu}</span>
        {share.can && dishes.length > 0 && (
          <button
            className="share-btn"
            aria-label={t.share}
            disabled={share.busy}
            onClick={() =>
              share.run({
                restaurant: result.restaurant || t.thisMenu,
                dishes: dishes.slice(0, 3),
                code: "ranking",
              })
            }
          >
            <ShareIcon size={19} />
          </button>
        )}
      </nav>
      {share.note && <div className="share-note">{share.note}</div>}
      {result.demo && <div className="sample-chip">{t.sampleBadge}</div>}
      {result.cached && (
        <div className="instant-chip">
          <BoltIcon size={14} />
          {t.instant}
        </div>
      )}
      <h2 className="results-heading">{t.bestChoices}</h2>

      <NeedsBar needs={needs} onNeed={onNeed} t={t} />

      {dishes.length === 0 && misfit.length > 0 && (
        <div className="weak-banner">
          <AlertIcon size={16} />
          <span>{t.nothingFits}</span>
        </div>
      )}

      {weakMenu && (
        <div className="weak-banner">
          <AlertIcon size={16} />
          <span>{t.weakMenu}</span>
        </div>
      )}

      <div className="podium">
        {podium.map((d) =>
          d.rank === 1 ? (
            // The winner is the one piece of real glass on this screen.
            <button key={d.rank} className="dish-card og-top" onClick={() => onOpen(d)}>
              <span className="og-top-head">
                <Medal rank={d.rank} />
                <span className="og-top-label">{t.topPick}</span>
              </span>
              <span className="dish-name">{d.name}</span>
              <span className="dish-reason">{d.reason}</span>
              {value && value.rank === d.rank && <ValueBadge t={t} />}
              <span className="og-top-foot">
                <TierChip tier={localizedTier(d.tier, lang)} big />
                {d.price && <span className="dish-price">{d.price}</span>}
              </span>
            </button>
          ) : (
          <button key={d.rank} className="dish-card podium-card" onClick={() => onOpen(d)}>
            <Medal rank={d.rank} />
            <span className="dish-info">
              <span className="dish-name">{d.name}</span>
              <span className="dish-reason">{d.reason}</span>
              {value && value.rank === d.rank && <ValueBadge t={t} />}
            </span>
            <TierCol dish={d} lang={lang} />
          </button>
          )
        )}
      </div>

      {value && value.rank > 3 && (
        <section className="best-value">
          <h3>
            <BanknoteIcon size={16} /> {t.bestValue}
          </h3>
          <p className="best-value-sub">{t.bestValueSub}</p>
          <button className="dish-card value-card" onClick={() => onOpen(value)}>
            <span className="rank">{value.rank}</span>
            <span className="dish-info">
              <span className="dish-name">{value.name}</span>
              <span className="dish-reason">{value.reason}</span>
            </span>
            <TierCol dish={value} lang={lang} />
          </button>
        </section>
      )}

      {rest.length > 0 && (
        <>
          <button className="btn ghost small og-more" onClick={() => setShowAll(!showAll)}>
            {showAll ? t.hide : t.showAll(dishes.length)}
            <ChevronDownIcon size={16} className={showAll ? "og-flip" : ""} />
          </button>
          {showAll && (
            <div className="rest-list">
              {rest.map((d) => (
                <button key={d.rank} className="dish-card" onClick={() => onOpen(d)}>
                  <span className="rank">{d.rank}</span>
                  <span className="dish-info">
                    <span className="dish-name">{d.name}</span>
                    <span className="dish-reason">{d.reason}</span>
                  </span>
                  <TierCol dish={d} lang={lang} />
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {misfit.length > 0 && (
        <section className="misfit">
          <button className="btn ghost small og-more" onClick={() => setShowMisfit(!showMisfit)}>
            {t.misfitTitle(misfit.length)}
            <ChevronDownIcon size={16} className={showMisfit ? "og-flip" : ""} />
          </button>
          {showMisfit && (
            <div className="rest-list">
              {misfit.map((d) => (
                <button
                  key={`${d.rank}-${d.name}`}
                  className="dish-card misfit-card"
                  onClick={() => onOpen(d)}
                >
                  <span className="dish-info">
                    <span className="dish-name">{d.name}</span>
                    <span className="clash">{t.contains(d.clash.map((g) => t.groups[g]))}</span>
                  </span>
                  <TierCol dish={d} lang={lang} />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <p className="hint">{t.tapHint}</p>
      <footer className="disclaimer">{t.disclaimerShort}</footer>
      {result.demo && <ScanYoursBar t={t} onScan={onScan} />}
    </div>
  );
}

// Diet and allergy chips, right on the ranking: one tap re-ranks this menu
// and every menu after it. This replaces the onboarding quiz rival apps make
// people sit through before they have seen anything.
function NeedsBar({ needs, onNeed, t }) {
  return (
    <div className="needs">
      <div className="needs-row" role="group" aria-label={t.needsLabel}>
        <span className="needs-label">{t.needsLabel}</span>
        {NEEDS.map((n) => {
          const on = needs.includes(n.id);
          return (
            <button
              key={n.id}
              className={`need-chip ${on ? "on" : ""}`}
              aria-pressed={on}
              onClick={() => onNeed(n.id)}
            >
              {on && <CheckIcon size={13} />}
              {t.needNames[n.id]}
            </button>
          );
        })}
      </div>
      {needs.length > 0 && <p className="needs-note">{t.needsSaved}</p>}
    </div>
  );
}

// Share the ranking as an image + tracked install link. `can` is decided at
// runtime: a browser always gets it (desktop falls back to save + copy link);
// the native app only shows it where the WebView exposes a share sheet, so no
// button ever appears that does nothing.
function useShare(t, lang) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const can = typeof navigator !== "undefined" && (!!navigator.share || !isNative());

  async function run({ restaurant, dishes, pick, code }) {
    if (busy) return;
    setBusy(true);
    const view = (d) => {
      const tier = localizedTier(d.tier, lang);
      return { ...d, tierLabel: tier.label, ink: TIER_INK[tier.key] || tier.color };
    };
    try {
      const blob = await drawShareCard({
        restaurant,
        dishes: dishes.map(view),
        pick: pick ? view(pick) : null,
        copy: {
          kicker: t.shareKicker,
          topPick: t.topPick,
          myOrder: t.shareMyOrder,
          footer: t.shareFooter,
          footerSub: t.shareFooterSub,
        },
      });
      const status = await shareImage({
        blob,
        title: "Ordo",
        text: t.shareText(restaurant),
        url: shareLink(code),
      });
      if (status === "saved") {
        setNote(t.shareSaved);
        setTimeout(() => setNote(""), 2600);
      }
    } finally {
      setBusy(false);
    }
  }

  return { can, busy, note, run };
}

// The end of the core loop. "I'm ordering this" used to just relabel its own
// button; now a good order gets its moment: the count, the tier the asks
// earned, progress to the next milestone, and the natural next step at a
// table: send the ranking to everyone else deciding.
const MILESTONES = [3, 5, 10, 25, 50, 100, 250, 500];

function OrderMoment({ count, dish, from, to, share, onShare, onClose, t }) {
  const next = MILESTONES.find((m) => m > count) || count + 100;
  const hit = MILESTONES.includes(count);
  // The ring fills from where it was to where this order puts it.
  const [fill, setFill] = useState((count - 1) / next);
  useEffect(() => {
    // A timer, not rAF: rAF is paused in a backgrounded WebView, and the ring
    // must still land on the right value. 60ms lets the start state paint so
    // the CSS transition has something to animate from.
    const id = setTimeout(() => setFill(hit ? 1 : count / next), 60);
    return () => clearTimeout(id);
  }, [count, next, hit]);
  const R = 56;
  const C = 2 * Math.PI * R;

  return (
    <div className="moment-overlay" onClick={onClose}>
      <div className="moment-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t.counted(count)}>
        <div className="moment-ring">
          <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden="true">
            <defs>
              <linearGradient id="og-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F7E7BF" />
                <stop offset="1" stopColor="#7FE0DA" />
              </linearGradient>
            </defs>
            <circle cx="66" cy="66" r={R} className="ring-track" />
            <circle
              cx="66"
              cy="66"
              r={R}
              className="ring-fill"
              stroke="url(#og-ring)"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - fill)}
            />
          </svg>
          <span className="moment-num">
            <LeafIcon size={20} />#{count}
          </span>
        </div>
        <h2 className="moment-title">{t.counted(count)}</h2>
        <p className="moment-dish">{dish.name}</p>
        {from && to && (
          <div className="moment-tiers">
            <TierChip tier={from} />
            <span className="arrow">→</span>
            <TierChip tier={to} big />
            <span className="moment-asks">{t.momentImproved}</span>
          </div>
        )}
        <p className="moment-line">
          {count === 1 ? t.momentFirst : hit ? t.momentMilestone(count) : t.momentNext(next - count, next)}
        </p>
        <p className="moment-sub">{t.momentLine}</p>
        <div className="moment-actions">
          {share.can && (
            <button className="btn primary big-scan" disabled={share.busy} onClick={onShare}>
              <ShareIcon size={20} />
              {t.sendTable}
            </button>
          )}
          {share.note && <p className="moment-note">{share.note}</p>}
          <button className="btn ghost small moment-done" onClick={onClose}>
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
}

// Pinned under the sample ranking and its dishes: the moment someone has just
// seen what Ordo does is the moment to hand them their own menu.
function ScanYoursBar({ t, onScan }) {
  return (
    <div className="scan-yours">
      <p className="scan-yours-text">{t.sampleBanner}</p>
      <button className="btn primary big-scan" onClick={onScan}>
        <CameraIcon size={20} />
        {t.scanYours}
      </button>
    </div>
  );
}

// Tier chip only. The "→ Good" potential preview used to render here too, on
// every card in the list — up to ten arrows competing with the ranking itself.
// It still appears on the Detail screen, where it is tied to the actual asks
// the diner can toggle and therefore means something.
function TierCol({ dish, lang }) {
  return (
    <span className="tier-col">
      <TierChip tier={localizedTier(dish.tier, lang)} />
      {dish.price && <span className="dish-price">{dish.price}</span>}
    </span>
  );
}

function ValueBadge({ t }) {
  return (
    <span className="value-badge">
      <BanknoteIcon size={13} />
      {t.bestValue}
    </span>
  );
}

// Display colours for the tiers. The engine's own colours stay untouched (they
// travel in scan results and history); these are the brighter, softer inks the
// glass layer needs so every chip reads at ≥9:1. Unknown keys fall back.
const TIER_INK = {
  excellent: "#74E6BB",
  good: "#D6DE68",
  fair: "#F5C451",
  poor: "#FF9A80",
  splurge: "#CFD8DC",
};

function TierChip({ tier, big }) {
  const ink = TIER_INK[tier.key] || tier.color;
  return (
    <span
      className={`tier-chip ${big ? "big" : ""}`}
      style={{ color: ink, borderColor: ink }}
    >
      <TierDot color={ink} />
      {tier.label}
    </span>
  );
}

/* ---------------- Detail + Improve + Waiter Script ---------------- */

function Detail({ dish, allDishes, onSwap, onBack, onOrdered, restaurant, demo, onScan, needs, t, lang }) {
  const [active, setActive] = useState([]);
  const [showScript, setShowScript] = useState(false);
  const [orderedNo, setOrderedNo] = useState(null); // better-order number, or 0 = plain "enjoy"
  const [moment, setMoment] = useState(false);
  const share = useShare(t, lang);

  const clash = conflicts(dish, needs);
  const allergies = allergyGroups(needs);
  // What the diner can't have travels to the waiter card too: the kitchen is
  // the only one who actually knows, so Ordo's job is to make asking easy.
  const needLines = NEEDS.filter((n) => needs.includes(n.id))
    .map((n) => t.needScript[n.id])
    .filter(Boolean);
  const canScript = active.length > 0 || needLines.length > 0;

  // The Yuka move: on a weak dish, offer a stronger dish from THIS menu —
  // same section first (same craving), one tap to switch. Never judgment
  // without an exit. A dish the diner's needs rule out gets the same exit.
  const swaps =
    (dish.score < 65 || clash.length > 0) && allDishes && allDishes.length
      ? (() => {
          const cands = allDishes.filter(
            (d) => d.score >= 65 && d.name !== dish.name
          );
          const sameSection = cands.filter(
            (d) => d.section && d.section === dish.section
          );
          return (sameSection.length ? sameSection : cands).slice(0, 2);
        })()
      : [];

  const value = bestValue(allDishes);
  const isValue = !!value && value.name === dish.name;

  const curTier = localizedTier(dish.tier, lang);
  const predictedScore =
    active.length === 0 ? dish.score : computeScore(applyMods(dish, active));
  const predictedTier = localizedTier(tierFor(predictedScore), lang);
  const improved = active.length > 0 && predictedTier.key !== dish.tier.key;

  // Best case if the diner makes every ask — shown up front as motivation.
  const allIds = dish.improvements.map((m) => m.id);
  const bestTier = localizedTier(
    tierFor(allIds.length ? computeScore(applyMods(dish, allIds)) : dish.score),
    lang
  );
  const showPotential = active.length === 0 && bestTier.key !== dish.tier.key;

  function toggle(id) {
    setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  function orderIt() {
    if (orderedNo !== null) return;
    // A "better order" = a genuinely strong pick, or any dish improved by asks.
    const qualifies = active.length > 0 || dish.score >= 65;
    // Nobody ate the sample, so it must not inflate the Better Orders count.
    if (qualifies && !demo) {
      const next = recordBetterOrder(dish);
      onOrdered(next);
      setOrderedNo(next.count);
      setShowScript(false);
      setMoment(true);
    } else {
      setOrderedNo(0);
    }
  }

  return (
    <div className="screen detail">
      <nav className="topbar">
        <button className="back" onClick={onBack}>
          <ChevronIcon size={18} />
          {t.backResults}
        </button>
      </nav>

      <h2 className="dish-title">{dish.name}</h2>
      <div className="tier-row">
        <TierChip tier={curTier} big />
        <span className="confidence">
          {t.confidence}: {t.confidenceVals[dish.confidence] || dish.confidence}
        </span>
      </div>
      {isValue && (
        <div className="value-row">
          <ValueBadge t={t} />
        </div>
      )}

      {clash.length > 0 ? (
        <div className="weak-banner">
          <AlertIcon size={16} />
          <span>{t.likelyContains(clash.map((g) => t.groups[g]))}</span>
        </div>
      ) : allergies.length > 0 ? (
        // Never "safe": only what a typical recipe holds, and a nudge to ask.
        <div className="allergy-note">
          <AlertIcon size={16} />
          <span>{t.allergyNote(allergies.map((g) => t.groups[g]))}</span>
        </div>
      ) : null}

      <div className="chips">
        {dish.price && (
          <span className="chip price-chip">
            <BanknoteIcon size={14} />
            {dish.price}
          </span>
        )}
        <span className="chip">
          <FlameIcon size={14} />
          {methodLabel(dish.cooking_method, lang)}
        </span>
        <span className="chip">
          <LayersIcon size={14} />
          {processingLabel(dish.nova, lang)}
        </span>
        {dish.section && (
          <span className="chip">
            <TagIcon size={14} />
            {dish.section}
          </span>
        )}
      </div>

      {/* The model already extracts the 3-6 defining ingredients on every scan
          and we were paying for them without ever showing them. "What's
          actually in this?" is a real question at a table, and answering it
          costs nothing extra. */}
      {dish.ingredients?.length > 0 && (
        <section className="ingredients">
          <h3>{t.whatsInIt}</h3>
          <p className="ingredient-line">{dish.ingredients.join(" · ")}</p>
        </section>
      )}

      {dish.benefits.length > 0 && (
        <section>
          <h3>{t.goingForIt}</h3>
          <ul className="fact-list good">
            {dish.benefits.map((b) => (
              <li key={b}>
                <CheckIcon size={15} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dish.concerns.length > 0 && (
        <section>
          <h3>{t.worthKnowing}</h3>
          <ul className="fact-list bad">
            {dish.concerns.map((c) => (
              <li key={c}>
                <AlertIcon size={15} />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {swaps.length > 0 && (
        <section className="swap">
          <h3>{t.betterHere}</h3>
          {swaps.map((d) => (
            <button
              key={d.name}
              className="dish-card swap-card"
              onClick={() => onSwap(d)}
            >
              <span className="dish-info">
                <span className="dish-name">{d.name}</span>
                <span className="dish-reason">{d.reason}</span>
              </span>
              {/* TierCol, not a bare chip: the swap's price decides it for a
                  diner on a budget as often as its tier does. */}
              <TierCol dish={d} lang={lang} />
            </button>
          ))}
        </section>
      )}

      {dish.improvements.length > 0 ? (
        <section className="improve">
          <h3>
            <SparkIcon size={16} /> {t.makeItBetter}
          </h3>
          <p className="improve-sub">{t.improveSub}</p>
          {dish.improvements.map((m) => (
            <label key={m.id} className={`mod ${active.includes(m.id) ? "on" : ""}`}>
              <input
                type="checkbox"
                checked={active.includes(m.id)}
                onChange={() => toggle(m.id)}
              />
              <span>{m.label}</span>
            </label>
          ))}
          {showPotential ? (
            <div className="predict potential">
              <TierChip tier={curTier} />
              <span className="arrow">→</span>
              <TierChip tier={bestTier} big />
              <span className="potential-note">{t.possible}</span>
            </div>
          ) : active.length > 0 ? (
            <div className={`predict ${improved ? "improved" : ""}`}>
              <TierChip tier={curTier} />
              <span className="arrow">→</span>
              <TierChip tier={predictedTier} big />
              {improved && <span className="celebrate">{t.nice}</span>}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="improve">
          <h3>
            <SparkIcon size={16} /> {t.alreadyStrong}
          </h3>
          <p className="improve-sub">{t.alreadyStrongSub}</p>
        </section>
      )}

      <div className="order-actions">
        {canScript && (
          <button className="btn primary" onClick={() => setShowScript(true)}>
            <ReceiptIcon size={20} />
            {t.waiter}
          </button>
        )}
        <button
          className={`btn ${canScript ? "secondary" : "primary"} ${
            orderedNo !== null ? "done" : ""
          }`}
          onClick={orderIt}
        >
          {orderedNo === null ? (
            <>
              <CheckIcon size={18} />
              {t.orderThis}
            </>
          ) : orderedNo > 0 ? (
            <>
              <LeafIcon size={18} />
              {t.counted(orderedNo)}
            </>
          ) : (
            t.enjoy
          )}
        </button>
      </div>

      <footer className="disclaimer">{t.disclaimerShort}</footer>
      {demo && <ScanYoursBar t={t} onScan={onScan} />}

      {moment && orderedNo > 0 && (
        <OrderMoment
          count={orderedNo}
          dish={dish}
          from={improved ? curTier : null}
          to={improved ? predictedTier : null}
          share={share}
          onShare={() =>
            share.run({
              restaurant,
              dishes: allDishes.slice(0, 3),
              pick: improved ? { ...dish, tier: tierFor(predictedScore) } : dish,
              code: "table",
            })
          }
          onClose={() => setMoment(false)}
          t={t}
        />
      )}

      {showScript && (
        <ScriptCard
          dish={dish}
          activeIds={active}
          extraLines={needLines}
          lang={lang}
          t={t}
          orderedNo={orderedNo}
          onOrder={orderIt}
          onClose={() => setShowScript(false)}
        />
      )}
    </div>
  );
}

/* The Waiter Script — a bright card you show across the table. */
function ScriptCard({ dish, activeIds, extraLines = [], lang, t, orderedNo, onOrder, onClose }) {
  const lines = [...scriptLines(dish, activeIds, lang), ...extraLines];
  return (
    <div className="script-overlay">
      <div className="script-card">
        <div className="script-brand">
          ORD<span>O</span>
        </div>
        <p className="script-opener">{t.scriptOpener}</p>
        <h2 className="script-dish">{dish.name}</h2>
        <ul className="script-lines">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="script-hint">{t.scriptHint}</p>
        <div className="script-actions">
          <button
            className={`btn primary ${orderedNo !== null ? "done" : ""}`}
            onClick={onOrder}
          >
            {orderedNo === null ? (
              <>
                <CheckIcon size={18} />
                {t.orderThis}
              </>
            ) : orderedNo > 0 ? (
              <>
                <LeafIcon size={18} />
                {t.counted(orderedNo)}
              </>
            ) : (
              t.enjoy
            )}
          </button>
          <button className="btn ghost-dark" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}

function methodLabel(method, lang) {
  const loc = LOCALES[lang] || LOCALES.en;
  return loc.methods[method] || method;
}
