// Generates Ordo app icons as real PNGs using only node's zlib.
// v2.0 design: deep teal-charcoal field with a soft radial glow, a two-tone
// polished-gold "O" ring (lit from above), a subtle drop shadow beneath the
// ring, and a hairline inner accent — premium, not flat.
import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// `rgb: true` emits PNG color type 2 (no alpha channel) instead of type 6.
// Every pixel here is opaque either way, but Apple rejects an app icon whose
// header merely DECLARES an alpha channel, so the iOS master must be type 2.
function png(size, draw, rgb = false) {
  const ch = rgb ? 3 : 4;
  const stride = size * ch + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = draw(x, y, size);
      const o = y * stride + 1 + x * ch;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
      if (!rgb) raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = rgb ? 2 : 6; // 8-bit RGB or RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const smooth = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// Palette
const FIELD_TOP = [16, 42, 46];    // deep teal, lit
const FIELD_BOT = [7, 18, 20];     // near-black teal
const GLOW = [22, 74, 74];         // radial glow behind the ring
const GOLD_LIT = [236, 205, 110];  // polished gold, top light
const GOLD_MID = [206, 165, 62];
const GOLD_DARK = [148, 111, 40];  // shadow side
const HAIRLINE = [58, 88, 88];

function draw(x, y, s) {
  const cx = s / 2, cy = s / 2;
  const dx = x - cx, dy = y - cy;
  const d = Math.hypot(dx, dy);

  // 1. Field: vertical gradient + soft radial glow behind the ring
  let px = mix(FIELD_TOP, FIELD_BOT, y / s);
  const glow = Math.max(0, 1 - d / (s * 0.46));
  px = mix(px, GLOW, glow * glow * 0.55);

  // 2. Soft drop shadow under the ring (offset down-right)
  const dShadow = Math.hypot(dx - s * 0.012, dy - s * 0.028);
  const rMid = s * 0.295, rHalf = s * 0.06;
  const shadowBand = Math.abs(dShadow - rMid);
  const shadow = 1 - smooth(rHalf * 0.9, rHalf * 2.1, shadowBand);
  px = mix(px, [3, 8, 9], shadow * 0.5);

  // 3. Hairline outer accent ring
  const hairBand = Math.abs(d - s * 0.415);
  const hair = 1 - smooth(s * 0.0015, s * 0.006, hairBand);
  px = mix(px, HAIRLINE, hair * 0.5);

  // 4. The gold "O": two-tone metal, lit from the top-left
  const ringBand = Math.abs(d - rMid);
  const inRing = 1 - smooth(rHalf - s * 0.008, rHalf + s * 0.008, ringBand);
  if (inRing > 0) {
    // angle-based sheen: light at top-left, dark at bottom-right
    const ang = Math.atan2(dy, dx); // -PI..PI
    const lightness = 0.5 + 0.5 * Math.cos(ang + Math.PI * 0.75);
    let gold = mix(GOLD_DARK, GOLD_LIT, lightness);
    // bevel: brighter at the ring's outer edge on the lit side
    const edge = (d - rMid) / rHalf; // -1..1 across the band
    gold = mix(gold, GOLD_LIT, Math.max(0, -edge) * 0.25 * lightness);
    gold = mix(gold, GOLD_DARK, Math.max(0, edge) * 0.3 * (1 - lightness));
    px = mix(px, gold, inRing);
    // inner hairline highlight on the very top of the ring
    const topHi = Math.max(0, Math.cos(ang + Math.PI / 2)) * inRing;
    px = mix(px, [248, 226, 156], topHi * 0.22);
  }

  return px.map((v) => Math.max(0, Math.min(255, Math.round(v))));
}

mkdirSync("public", { recursive: true });
for (const size of [180, 512]) {
  writeFileSync(`public/icon-${size}.png`, png(size, draw));
  console.log(`wrote public/icon-${size}.png`);
}

// iOS master icon. @capacitor/assets reads this during the Codemagic build and
// derives every size Xcode needs — there is no icon upload field for iOS on
// App Store Connect, so this file IS how the icon reaches Apple. Apple rejects
// icons with an alpha channel; png() writes opaque RGB, which is why this
// generator can feed it directly.
mkdirSync("assets/ios", { recursive: true });
writeFileSync("assets/ios/icon-only.png", png(1024, draw, true));
console.log("wrote assets/ios/icon-only.png (1024, opaque RGB)");
