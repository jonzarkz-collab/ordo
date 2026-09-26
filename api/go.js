// Smart link for social posts: /go/<code> (rewritten to /api/go?c=<code>).
//
// Sends every click to the App Store with Apple's campaign token (ct) so App
// Analytics can attribute installs to the post.
//
// Each click is one JSON line in the Vercel runtime logs — no database needed
// to count clicks per video.

const APP_STORE = "https://apps.apple.com/app/id6802338296";

export default function handler(req, res) {
  const raw = String(req.query.c || "direct");
  const code = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "direct";
  const ua = String(req.headers["user-agent"] || "");
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const os = ios ? "ios" : /Android/i.test(ua) ? "android" : "other";
  // Link scanners (YouTube/Google safety checks, chat previews) hit a new link
  // within seconds of posting. Tag them so click counts reflect real people.
  const bot = /bot|crawl|spider|preview|google|facebookexternalhit|headless|curl|python|node-fetch|axios/i.test(ua) || !/Mozilla/i.test(ua);

  console.log(
    JSON.stringify({
      evt: "go",
      c: code,
      os,
      bot,
      ua: ua.slice(0, 80),
      country: req.headers["x-vercel-ip-country"] || "",
    })
  );

  // Zafar's call (2026-09-26): every click goes to the App Store, Android
  // included — we measure App Store downloads only.
  // Provider ID (pt) is public — it appears in every App Store campaign link.
  const pt = process.env.ORDO_ASC_PROVIDER_ID || "129281746";
  const target = `${APP_STORE}?ct=${encodeURIComponent(code)}${pt ? `&pt=${pt}` : ""}&mt=8`;
  res.setHeader("Cache-Control", "no-store");
  res.writeHead(302, { Location: target });
  res.end();
}
