// "Send to the table": the ranking as an image a group chat will actually
// open, plus a tracked install link. Tables decide together ("what are you
// getting?"), and every shared ranking is Ordo working in front of someone
// who doesn't have it yet. Ordo's real problem is being found, not the
// product (rival research, Sep 2026), so this is the growth loop.
//
// Drawn with plain canvas 2D, no libraries: 1080x1350 (4:5) reads well in
// iMessage, WhatsApp and Telegram previews.

export const SHARE_BASE = "https://ordo-one-green.vercel.app";
// /go/<code> → App Store with a campaign token, so App Analytics counts
// installs from shared rankings separately (api/go.js).
export const shareLink = (code) => `${SHARE_BASE}/go/${code}`;

const W = 1080;
const H = 1350;
const PAD = 80;
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MEDAL = ["#F6D88A", "#D3DBE0", "#F0C8A0"];
const INK = "#F7F9F8";
const MUTED = "#CBD5D2";
const CHAMPAGNE = "#F7E7BF";
const TEAL = "#7FE0DA";

function font(ctx, size, weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Letter-spaced text without ctx.letterSpacing (Safari < 17 lacks it).
function spaced(ctx, text, x, y, gap, align = "left") {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let cx = align === "center" ? x - total / 2 : x;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + gap;
  });
  return total;
}

function fit(ctx, s, maxW) {
  if (ctx.measureText(s).width <= maxW) return s;
  while (s.length && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s.trimEnd() + "…";
}

function wrap(ctx, text, maxW, maxLines) {
  const lines = [];
  let cur = "";
  for (const w of String(text).split(/\s+/)) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= maxW || !cur) cur = next;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  const kept = lines.slice(0, maxLines).map((l) => fit(ctx, l, maxW));
  if (lines.length > maxLines) kept[maxLines - 1] = fit(ctx, kept[maxLines - 1] + "…", maxW);
  return kept;
}

function medal(ctx, rank, cx, cy, r) {
  const c = MEDAL[rank - 1] || MUTED;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = c;
  ctx.stroke();
  font(ctx, r * 0.95, 650);
  ctx.fillStyle = c;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(rank), cx, cy + 2);
  ctx.textBaseline = "alphabetic";
}

// Returns the pill's width; draws only when `draw` is set (for measuring).
function pill(ctx, label, ink, x, y, size, draw = true) {
  font(ctx, size, 650);
  const dot = size * 0.32;
  const w = size * 0.9 + dot * 2 + 12 + ctx.measureText(label).width + size * 0.9;
  const h = size * 1.9;
  if (draw) {
    rrect(ctx, x, y, w, h, h / 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size * 0.9 + dot, y + h / 2, dot, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + size * 0.9 + dot * 2 + 12, y + h / 2 + 1);
    ctx.textBaseline = "alphabetic";
  }
  return w;
}

/**
 * dishes: the ranked dishes to show (top 3 of what fits), each with
 *   { rank, name, reason, price, tierLabel, ink }
 * pick: optional { name, tierLabel, ink } — the diner's own order.
 * copy: { kicker, topPick, myOrder, footer, footerSub }
 */
export function drawShareCard({ restaurant, dishes, pick, copy }) {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");

  // the teal night + two soft light pools, same as the app
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1D3F45");
  bg.addColorStop(0.5, "#16333A");
  bg.addColorStop(1, "#112529");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (const [x, y, r, c] of [
    [120, 60, 700, "rgba(70,190,184,.20)"],
    [1080, 640, 620, "rgba(230,200,130,.12)"],
  ]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // wordmark: ORD + gold O
  font(ctx, 46, 500);
  ctx.fillStyle = INK;
  const wordW = spaced(ctx, "ORDO", -9999, -9999, 16);
  const wx = W / 2 - wordW / 2;
  const dw = spaced(ctx, "ORD", wx, 112, 16) + 16;
  ctx.fillStyle = "#E4C273";
  ctx.fillText("O", wx + dw, 112);

  // kicker + restaurant
  font(ctx, 27, 650);
  ctx.fillStyle = CHAMPAGNE;
  spaced(ctx, copy.kicker.toUpperCase(), W / 2, 205, 5, "center");
  font(ctx, 66, 700);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  const nameLines = wrap(ctx, restaurant, W - PAD * 2, 2);
  nameLines.forEach((l, i) => ctx.fillText(l, W / 2, 288 + i * 76));
  let y = 288 + (nameLines.length - 1) * 76 + 64;

  const pickInList = pick && dishes.some((d) => d.name === pick.name);
  const showStrip = pick && !pickInList;
  const footerTop = H - 175;
  const room = footerTop - 30 - y - (showStrip ? 118 : 0);
  const cardW = W - PAD * 2;

  // Measure first, then draw. Each card's height comes from its content (a
  // long name or a two-line restaurant must never push text into a pill), and
  // when the stack is too tall it sheds detail in order: two-line names on #2
  // and #3, then their reasons, then the top pick's reason and second line.
  const RANKS = [
    { lines1: 2, reason1: true, lines: 2, reasons: true },
    { lines1: 2, reason1: true, lines: 1, reasons: true },
    { lines1: 2, reason1: true, lines: 1, reasons: false },
    { lines1: 1, reason1: true, lines: 1, reasons: false },
    { lines1: 1, reason1: false, lines: 1, reasons: false },
  ];
  const plan = (o) =>
    dishes.map((d, i) => {
      const mine = pick && pick.name === d.name;
      if (i === 0) {
        font(ctx, 52, 700);
        const lines = wrap(ctx, d.name, cardW - 80, o.lines1);
        const reason = o.reason1 && d.reason ? d.reason : "";
        const lastName = 150 + (lines.length - 1) * 60;
        const pillTop = (reason ? lastName + 46 : lastName) + 30;
        return { lines, reason, pillTop, h: pillTop + 53 + 34, mine };
      }
      const pw = pill(ctx, d.tierLabel, d.ink, 0, 0, 24, false);
      const maxW = cardW - 128 - pw - 40 - 30;
      font(ctx, 42, 700);
      const lines = wrap(ctx, d.name, maxW, o.lines);
      const sub = mine ? copy.myOrder : o.reasons ? d.reason : "";
      const block = lines.length * 50 + (sub ? 40 : 0);
      return { lines, sub, pw, maxW, block, h: Math.max(132, block + 64), mine };
    });
  let cards;
  for (const o of RANKS) {
    cards = plan(o);
    const total = cards.reduce((s, c) => s + c.h, 0) + 22 * (cards.length - 1);
    if (total <= room) break;
  }

  dishes.forEach((d, i) => {
    const c = cards[i];
    const h = c.h;
    const mine = c.mine;
    rrect(ctx, PAD, y, cardW, h, 36);
    ctx.fillStyle = i === 0 ? "rgba(255,255,255,.085)" : "rgba(10,28,32,.55)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = mine ? "rgba(247,231,191,.70)" : i === 0 ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.07)";
    ctx.stroke();

    if (i === 0) {
      medal(ctx, d.rank, PAD + 74, y + 72, 34);
      font(ctx, 26, 650);
      ctx.fillStyle = CHAMPAGNE;
      const lw = spaced(ctx, copy.topPick.toUpperCase(), PAD + 128, y + 82, 5);
      if (mine) {
        font(ctx, 26, 650);
        ctx.fillStyle = TEAL;
        spaced(ctx, "· " + copy.myOrder.toUpperCase(), PAD + 128 + lw + 14, y + 82, 5);
      }
      font(ctx, 52, 700);
      ctx.fillStyle = INK;
      ctx.textAlign = "left";
      c.lines.forEach((l, k) => ctx.fillText(l, PAD + 40, y + 150 + k * 60));
      if (c.reason) {
        font(ctx, 30, 450);
        ctx.fillStyle = MUTED;
        ctx.fillText(fit(ctx, c.reason, cardW - 80), PAD + 40, y + 150 + (c.lines.length - 1) * 60 + 46);
      }
      pill(ctx, d.tierLabel, d.ink, PAD + 40, y + c.pillTop, 28);
      if (d.price) {
        font(ctx, 40, 650);
        ctx.fillStyle = INK;
        ctx.textAlign = "right";
        ctx.fillText(d.price, PAD + cardW - 40, y + c.pillTop + 41);
      }
    } else {
      medal(ctx, d.rank, PAD + 70, y + h / 2, 30);
      const textX = PAD + 128;
      font(ctx, 42, 700);
      ctx.fillStyle = INK;
      ctx.textAlign = "left";
      const ty = y + h / 2 - c.block / 2 + 38;
      c.lines.forEach((l, k) => ctx.fillText(l, textX, ty + k * 50));
      if (c.sub) {
        font(ctx, 27, mine ? 650 : 450);
        ctx.fillStyle = mine ? TEAL : MUTED;
        ctx.fillText(fit(ctx, c.sub, c.maxW), textX, ty + (c.lines.length - 1) * 50 + 44);
      }
      pill(ctx, d.tierLabel, d.ink, PAD + cardW - 40 - c.pw, y + h / 2 - 23, 24);
    }
    y += h + 22;
  });

  if (showStrip) {
    rrect(ctx, PAD, y + 8, cardW, 92, 28);
    ctx.fillStyle = "rgba(127,224,218,.08)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(127,224,218,.45)";
    ctx.stroke();
    const pw = pill(ctx, pick.tierLabel, pick.ink, 0, 0, 24, false);
    font(ctx, 34, 650);
    ctx.fillStyle = TEAL;
    ctx.textAlign = "left";
    ctx.fillText(fit(ctx, `${copy.myOrder}: ${pick.name}`, cardW - pw - 100), PAD + 36, y + 66);
    pill(ctx, pick.tierLabel, pick.ink, PAD + cardW - 36 - pw, y + 31, 24);
  }

  // footer: what this is, and where to get it
  ctx.fillStyle = "rgba(255,255,255,.10)";
  ctx.fillRect(PAD, footerTop, cardW, 2);
  font(ctx, 36, 650);
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.fillText(copy.footer, PAD, footerTop + 64);
  font(ctx, 28, 550);
  ctx.fillStyle = TEAL;
  ctx.fillText(SHARE_BASE.replace(/^https:\/\//, ""), PAD, footerTop + 108);
  font(ctx, 22, 450);
  ctx.fillStyle = MUTED;
  ctx.fillText(fit(ctx, copy.footerSub, cardW), PAD, footerTop + 146);

  return new Promise((resolve) => cv.toBlob((b) => resolve(b), "image/png"));
}

// Native share sheet where there is one (iOS/Android browsers, and WKWebView
// where it exposes Web Share). Otherwise (desktop browsers) the image is
// saved and the link copied, so the button always does something useful.
export async function shareImage({ blob, title, text, url }) {
  const file = new File([blob], "ordo-ranking.png", { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text: `${text}\n${url}` });
      return "shared";
    }
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
  } catch (e) {
    if (e?.name === "AbortError") return "cancelled";
    /* share sheet failed — fall back to saving */
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ordo-ranking.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  try {
    await navigator.clipboard?.writeText(url);
  } catch {
    /* clipboard blocked — the image still saved */
  }
  return "saved";
}
