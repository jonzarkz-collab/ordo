// Ordo — menu analysis endpoint. One Claude call per scan:
// menu photo/text -> structured facts (schema-enforced JSON) -> deterministic
// scoring in engine.js. The model never picks scores; it only extracts facts.
//
// v2.0: graduated processed_meat (primary vs garnish), stricter high_sodium
// firing rules, and Menu Memory — a cross-user result cache (Upstash KV via
// REST; activates automatically when KV_REST_API_URL/TOKEN env vars exist).
import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { rankDishes, ENGINE_VERSION } from "../src/lib/engine.js";

const SYSTEM = `You are a culinary nutrition analyst. You read restaurant menus and infer each dish's most LIKELY real-world composition as served in a typical restaurant.

RULES:
- Be realistic, not optimistic: restaurants use more oil, butter, salt and sugar than home recipes.
- Conservative defaults: if a cooking fat is unstated, assume refined oil or butter. If a sauce or dressing is unstated, assume it contains added sugar and/or cream — set the matching flags.
- Words like "crispy", "battered", "golden" imply deep-fried. "Creamy", "alfredo", "ranch" imply creamy sauce. "Glazed", "BBQ", "teriyaki", "sweet" imply added sugar.
- Health-halo words ("vegan", "gluten-free", "keto", "light") do NOT make a dish healthy — judge the actual ingredients and processing level (a vegan patty can still be ultra-processed, NOVA 4).
- Be fair to regional and traditional cuisines (Central Asian, Middle Eastern, Asian, etc.): judge the actual ingredients and cooking method, using authentic traditional recipes as your baseline — but flag genuinely heavy salt/oil/refined-carb traditions honestly (e.g. qurutob's salted qurut and oily fatir).
- processed_meat: "primary" ONLY when industrially processed meat (bacon, sausage, salami, ham, hot dogs, cured/deli meat, processed doner) is the MAIN protein of the dish; "garnish" when it appears in a small amount (bacon bits, a few pepperoni slices); otherwise "none". IMPORTANT: fresh meat, poultry or fish that is smoked, grilled or roasted in the kitchen is NOT processed meat.
- high_sodium: set ONLY for saliently salty dishes — cured/brined/pickled components as a major part, salted cheeses dominating, heavy soy/fish-sauce glazes, salt-crusted preparations, cured-meat dishes. Normal restaurant seasoning does NOT count.
- positives: only include a tag when the ingredient is genuinely present in a meaningful amount. lean_protein means fish, poultry, or plant protein that is NOT deep-fried and NOT processed meat.
- flags: set every flag that applies. ultra_processed means industrial ingredients (protein isolates, hydrogenated oils, processed patties/nuggets, candy, commercial desserts) — also set nova to 4.
- confidence: high if the menu text clearly states composition; medium if you inferred a standard recipe; low if the name is vague (e.g. "Chef's special").
- Extract at most 25 dishes. Skip drinks unless clearly a meal item; skip section headers.
- Be FAST and terse: ingredients = only the 3-6 defining items (including the inferred fat/sauce); section = one short word or empty. No prose anywhere.
- Menu text may be messy: a single run-on line, fragmented OCR, prices glued to names. Still extract every dish you can identify — an imperfect list beats an empty one.
- Do not invent dishes that are not on the menu.

CALIBRATION ANCHORS — identical classic dishes must ALWAYS get identical facts. Match these exactly unless the menu explicitly says otherwise:
- Greek salad (tomato, cucumber, feta, olives, olive oil): positives vegetables+healthy_fat+polyphenols; high_sodium=true; added_sugar_sauce=false; creamy_sauce=false; nova 1; raw.
- Caesar salad with chicken: positives vegetables+lean_protein; creamy_sauce=true; refined_carb_base=true (croutons); high_sodium=true; nova 3.
- Lentil or chickpea soup (чечевичный, нахут шурбо): positives legumes+vegetables+lean_protein; no flags; stewed; nova 1.
- Plov / pilaf with lamb: positives vegetables; refined_carb_base=true (white rice); nova 2; stewed.
- French fries / картофель фри: deep_fried=true; refined_carb_base=true; fried; nova 3.`;

const DISH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    restaurant_name: {
      type: "string",
      description: "Restaurant name if visible on the menu, else empty string",
    },
    dishes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          section: { type: "string", description: "Menu section, or empty string" },
          ingredients: {
            type: "array",
            items: { type: "string" },
            description: "ONLY the 3-6 defining ingredients, incl. the inferred cooking fat or sauce. Never exhaustive.",
          },
          cooking_method: {
            type: "string",
            enum: ["grilled", "steamed", "baked", "roasted", "sauteed", "fried", "raw", "boiled", "stewed", "unknown"],
          },
          nova: { type: "integer", enum: [1, 2, 3, 4] },
          flags: {
            type: "object",
            additionalProperties: false,
            properties: {
              deep_fried: { type: "boolean" },
              processed_meat: {
                type: "string",
                enum: ["none", "garnish", "primary"],
                description: "primary = processed meat is the main protein; garnish = small amount; none otherwise",
              },
              added_sugar_sauce: { type: "boolean" },
              refined_carb_base: { type: "boolean" },
              high_sodium: { type: "boolean" },
              creamy_sauce: { type: "boolean" },
              ultra_processed: { type: "boolean" },
            },
            required: [
              "deep_fried", "processed_meat", "added_sugar_sauce",
              "refined_carb_base", "high_sodium", "creamy_sauce", "ultra_processed",
            ],
          },
          positives: {
            type: "array",
            items: {
              type: "string",
              enum: ["vegetables", "legumes", "whole_grain", "omega3", "lean_protein", "healthy_fat", "polyphenols", "fermented"],
            },
          },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["name", "section", "ingredients", "cooking_method", "nova", "flags", "positives", "confidence"],
      },
    },
  },
  required: ["restaurant_name", "dishes"],
};

// ---- Menu Memory: cross-user result cache (Upstash Redis REST) -----------
// Zero-dependency: plain fetch against the Upstash single-command endpoint.
// Silently disabled until KV_REST_API_URL + KV_REST_API_TOKEN are set.

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const CACHE_TTL_S = 60 * 60 * 24 * 90; // menus change; forget after 90 days

async function kvCommand(cmd) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const r = await fetch(KV_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cmd),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.result ?? null;
  } catch {
    return null; // cache is best-effort; a scan must never fail because of it
  }
}

const cacheKey = (input, lang) =>
  `ordo:${ENGINE_VERSION}:${lang}:` +
  createHash("sha256").update(input).digest("hex");

// ---- Abuse guard — in-memory per serverless instance ----------------------
// Not bulletproof (cold starts reset it), but caps casual overuse if the link
// spreads: each uncached scan costs real API money.
const RL = { day: "", global: 0, perIp: new Map() };
const IP_LIMIT = 20; // scans per IP per day
const GLOBAL_LIMIT = 300; // scans per instance per day

function rateLimited(req) {
  const today = new Date().toISOString().slice(0, 10);
  if (RL.day !== today) {
    RL.day = today;
    RL.global = 0;
    RL.perIp.clear();
  }
  if (RL.global >= GLOBAL_LIMIT) return true;
  const ip = String(req.headers["x-forwarded-for"] || "?").split(",")[0].trim();
  const count = (RL.perIp.get(ip) || 0) + 1;
  RL.perIp.set(ip, count);
  RL.global += 1;
  return count > IP_LIMIT;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  const { image, text, lang } = req.body || {};
  const outLang = lang === "ru" ? "ru" : "en";
  if (!image && !text) {
    return res.status(400).json({ error: "Send a menu photo or pasted menu text." });
  }

  // Menu Memory first: a remembered menu is instant, free, and does not
  // count against anyone's rate limit.
  const rawInput = image ? image.data : String(text);
  const key = cacheKey(rawInput, outLang);
  const cached = await kvCommand(["GET", key]);
  if (cached) {
    try {
      const hit = JSON.parse(cached);
      return res.status(200).json({ ...hit, cached: true });
    } catch {
      /* corrupt entry — fall through to a fresh scan */
    }
  }

  if (rateLimited(req)) {
    return res.status(429).json({
      error:
        outLang === "ru"
          ? "Дневной лимит сканов исчерпан — попробуйте завтра."
          : "Daily scan limit reached — try again tomorrow.",
    });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "Server not configured: add ANTHROPIC_API_KEY in Vercel project settings.",
    });
  }

  // ---- Streaming phase -----------------------------------------------------
  // iOS Safari kills any request that stays silent for ~60s ("Load failed"),
  // no matter how high the server's own limit is. So we answer IMMEDIATELY
  // and keep the line warm with tiny NDJSON keepalive lines ("{}") while
  // Claude works; the real result (or a JSON error) is always the LAST line.
  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.write("{}\n"); // first byte out right away
  const keepalive = setInterval(() => {
    try {
      res.write("{}\n");
    } catch {
      /* connection already gone */
    }
  }, 8000);
  const finish = (obj) => {
    clearInterval(keepalive);
    try {
      res.write(JSON.stringify(obj) + "\n");
      res.end();
    } catch {
      /* connection already gone */
    }
  };

  try {
    const userContent = [];
    if (image) {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.media_type || "image/jpeg",
          data: image.data,
        },
      });
      userContent.push({
        type: "text",
        text: "Analyze every dish on this menu photo. Return the JSON object.",
      });
    } else {
      userContent.push({
        type: "text",
        text: `Analyze every dish on this menu. Return the JSON object.\n\nMENU TEXT:\n${String(text).slice(0, 12000)}`,
      });
    }

    const client = new Anthropic();
    const model = process.env.ORDO_MODEL || "claude-opus-4-8";
    const msg = await client.messages.create({
      model,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: userContent }],
      output_config: { format: { type: "json_schema", schema: DISH_SCHEMA } },
    });

    if (msg.stop_reason === "refusal") {
      return finish({ error: "The analyzer declined this image. Try a clearer menu photo." });
    }
    if (msg.stop_reason === "max_tokens") {
      return finish({ error: "Menu too large — try photographing one section at a time." });
    }

    const textBlock = msg.content.find((b) => b.type === "text");
    const parsed = JSON.parse(textBlock.text);
    if (!parsed.dishes || parsed.dishes.length === 0) {
      return finish({ error: "No dishes found — is this a menu? Try a clearer photo." });
    }

    const payload = {
      restaurant: parsed.restaurant_name || "",
      dishes: rankDishes(parsed.dishes, outLang),
    };
    // Remember this menu for everyone (best-effort, non-blocking failure).
    await kvCommand(["SET", key, JSON.stringify(payload), "EX", String(CACHE_TTL_S)]);
    return finish(payload);
  } catch (e) {
    return finish({
      error:
        e?.status === 429
          ? "Busy right now — try again in a minute."
          : `Analysis failed: ${e.message}`,
    });
  }
}
