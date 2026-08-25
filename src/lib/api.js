// Client helpers: image compression + API call + local history +
// Better Orders counter + on-device menu memory (hash match).

export function compressImage(file, maxDim = 1400, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({ media_type: "image/jpeg", data: dataUrl.split(",")[1] });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

// Under Capacitor the page origin is capacitor://localhost, so a same-origin
// "/api/scan" resolves to the app bundle and 404s — silently, at runtime, with
// no build error. Native builds must point at the deployed backend explicitly.
// On the web this stays empty so the request remains same-origin as before.
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export async function scanMenu(payload) {
  const res = await fetch(`${API_BASE}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  // The server streams NDJSON keepalive lines ("{}") while it works — this
  // keeps iOS Safari from killing long scans at ~60s. The real payload (or a
  // JSON error) is always the last non-empty line. Plain JSON error responses
  // (400/429/500) parse through the same path.
  const raw = await res.text();
  let data = {};
  try {
    const lines = raw.split("\n").filter((l) => l.trim());
    data = JSON.parse(lines[lines.length - 1] || "{}");
  } catch {
    data = {};
  }
  if (!res.ok || data.error || !data.dishes) {
    const err = new Error(data.error || `Scan failed (${res.status})`);
    err.status = res.ok ? 502 : res.status;
    throw err;
  }
  return data;
}

// SHA-256 of the scan input — lets this device recognize a menu it has
// already scanned (identical pasted text / re-shared screenshot) instantly.
export async function hashInput(payload, lang = "en") {
  try {
    // Language is part of the key: the same menu produces a different result in
    // each language now that dish names are translated too. Without this,
    // switching EN/RU and rescanning replays the cached copy in the OLD
    // language — which looks exactly like the localisation being broken.
    const raw =
      lang + ":" + (payload.image ? payload.image.data : String(payload.text || ""));
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(raw)
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null; // http context or old browser — memory is optional
  }
}

const HISTORY_KEY = "ordo_history_v1";

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

export function findCached(hash) {
  if (!hash) return null;
  return loadHistory().find((h) => h.hash === hash) || null;
}

export function saveToHistory(result, hash = null) {
  try {
    const top = result.dishes[0];
    const entry = {
      ts: Date.now(),
      hash,
      // Prefer the venue name; fall back to the winning dish — never a
      // generic "Menu scan" wall when you have 50 of them.
      title: result.restaurant || (top ? top.name : "Menu"),
      top: top ? `${top.name} — ${top.tier.label}` : "",
      result,
    };
    const list = [entry, ...loadHistory().filter((h) => !hash || h.hash !== hash)].slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked — history is optional */
  }
}

// ---- Better Orders — the longevity counter --------------------------------
// Counts real actions only (ordering a strong pick, or any dish improved with
// asks). Never logging, never guilt: wins accumulate, nothing decays.

const ORDERS_KEY = "ordo_better_orders_v1";

export function getBetterOrders() {
  try {
    return (
      JSON.parse(localStorage.getItem(ORDERS_KEY)) || { count: 0, last: null }
    );
  } catch {
    return { count: 0, last: null };
  }
}

export function recordBetterOrder(dish) {
  const cur = getBetterOrders();
  const next = {
    count: cur.count + 1,
    last: { name: dish.name, tierKey: dish.tier.key, ts: Date.now() },
  };
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
  } catch {
    /* optional */
  }
  return next;
}
