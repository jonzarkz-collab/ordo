// Ordo deterministic scoring engine — v2.0
// The LLM extracts FACTS (ingredients, method, flags). This engine computes the
// ranking. Shared by the serverless API and the client (live recalculation),
// so every number is reproducible. The internal 0-100 score is NEVER shown to
// users — they see rank + tier + factual reasons (council amendment #1).
//
// v2.0 calibration: processed_meat is graduated (primary protein vs garnish),
// high_sodium softened — a squeeze of salt is not a hot dog.

export const ENGINE_VERSION = "2.0.0";

export const POSITIVE_POINTS = {
  vegetables: 12,
  legumes: 10,
  whole_grain: 8,
  omega3: 8,
  lean_protein: 6,
  healthy_fat: 6,
  polyphenols: 6,
  fermented: 4,
};

export const NEGATIVE_POINTS = {
  added_sugar_sauce: -10,
  refined_carb_base: -8,
  high_sodium: -5, // v2.0: was -8; fires only on genuinely salty dishes now
  creamy_sauce: -5,
};

const PROCESSED_GARNISH_PENALTY = -6; // bacon bits ≠ a plate of sausage

export const MULTIPLIERS = {
  deep_fried: 0.75,
  ultra_processed: 0.7,
};
const PROCESSED_PRIMARY_MULT = 0.75; // only when processed meat IS the dish

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

// Normalize flags across versions: v1 sent processed_meat as boolean,
// v2 sends "none" | "garnish" | "primary". Old history entries keep working.
export function normFlags(flags = {}) {
  const pm = flags.processed_meat;
  const level =
    pm === true ? "primary" : pm === "primary" || pm === "garnish" ? pm : "none";
  return { ...flags, processed_meat: level };
}

export function computeScore(facts) {
  const positives = facts.positives || [];
  const flags = normFlags(facts.flags);

  let pos = 0;
  for (const p of positives) pos += POSITIVE_POINTS[p] || 0;
  // Fiber synergy: whole plant foods in combination
  const fiberSources = ["vegetables", "legumes", "whole_grain"].filter((k) =>
    positives.includes(k)
  );
  if (fiberSources.length >= 2) pos += 8;
  pos = Math.min(pos, 45); // cap — balance beats one hero ingredient

  let neg = 0;
  for (const [flag, pts] of Object.entries(NEGATIVE_POINTS)) {
    if (flags[flag]) neg += pts;
  }
  if (flags.processed_meat === "garnish") neg += PROCESSED_GARNISH_PENALTY;

  let score = 50 + pos + neg;
  for (const [flag, mult] of Object.entries(MULTIPLIERS)) {
    if (flags[flag]) score *= mult;
  }
  if (flags.processed_meat === "primary") score *= PROCESSED_PRIMARY_MULT;
  return clamp(score);
}

// Ordered list of active concern keys (drives concern lists + reason lines).
export function concernKeys(rawFlags) {
  const f = normFlags(rawFlags);
  const keys = [];
  if (f.deep_fried) keys.push("deep_fried");
  if (f.processed_meat !== "none") keys.push("processed_meat");
  if (f.ultra_processed) keys.push("ultra_processed");
  if (f.added_sugar_sauce) keys.push("added_sugar_sauce");
  if (f.refined_carb_base) keys.push("refined_carb_base");
  if (f.high_sodium) keys.push("high_sodium");
  if (f.creamy_sauce) keys.push("creamy_sauce");
  return keys;
}

export const TIERS = [
  { min: 80, key: "excellent", label: "Excellent", color: "#3ECF8E" },
  { min: 65, key: "good", label: "Good", color: "#C9D64F" },
  { min: 50, key: "fair", label: "Fair", color: "#F0B429" },
  { min: 35, key: "poor", label: "Poor", color: "#F26B4E" },
  { min: 0, key: "splurge", label: "Splurge", color: "#9AA5AB" },
];

export function tierFor(score) {
  return TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1];
}

// ---- Localized text -------------------------------------------------------
// All user-facing strings the engine produces, keyed by language.
// The internal keys (flags/positives/tier keys) never change — only labels.

export const LOCALES = {
  en: {
    tiers: {
      excellent: "Excellent",
      good: "Good",
      fair: "Fair",
      poor: "Poor",
      splurge: "Splurge",
    },
    benefits: {
      vegetables: "Built on vegetables",
      legumes: "Legumes — a staple of the longest-lived diets",
      whole_grain: "Whole grains instead of refined",
      omega3: "Source of omega-3 fats",
      lean_protein: "Quality lean protein",
      healthy_fat: "Healthy fats (olive oil, nuts, avocado)",
      polyphenols: "Polyphenol-rich ingredients",
      fermented: "Contains fermented foods",
    },
    concerns: {
      deep_fried: "Deep-fried",
      ultra_processed: "Ultra-processed ingredients",
      processed_meat: "Processed meat (bacon, sausage, cured)",
      added_sugar_sauce: "Likely added sugar in the sauce or glaze",
      refined_carb_base: "Refined-carb base (white flour, rice or fries)",
      high_sodium: "Notably salty (cured / brined / heavy soy)",
      creamy_sauce: "Creamy sauce — likely butter or cream",
    },
    short: {
      vegetables: "vegetables",
      legumes: "legumes",
      whole_grain: "whole grains",
      omega3: "omega-3",
      lean_protein: "lean protein",
      healthy_fat: "healthy fats",
      polyphenols: "polyphenols",
      fermented: "fermented",
      deep_fried: "deep-fried",
      ultra_processed: "ultra-processed",
      processed_meat: "processed meat",
      added_sugar_sauce: "added sugar",
      refined_carb_base: "refined carbs",
      high_sodium: "salty",
      creamy_sauce: "creamy sauce",
    },
    methods: {
      grilled: "grilled",
      steamed: "steamed",
      baked: "baked",
      roasted: "roasted",
      sauteed: "sautéed",
      fried: "fried",
      raw: "raw",
      boiled: "boiled",
      stewed: "stewed",
      unknown: "unknown",
    },
    mods: {
      unfry: "Ask for it grilled or baked instead of fried",
      sauce_side: "Ask for the creamy sauce on the side — use a little",
      skip_sugar: "Skip the sweet glaze / ask for the sauce on the side",
      swap_side: "Swap the fries / white rice / bread for salad or veggies",
      skip_processed: "Skip the bacon / sausage / cured meat",
      light_salt: "Ask for it light on salt, dressing on the side",
      add_greens: "Add a side of greens or grilled vegetables",
    },
    // Waiter-ready phrasings — what you actually say/show at the table.
    scripts: {
      unfry: "grilled or baked instead of deep-fried, please",
      sauce_side: "the creamy sauce on the side, please",
      skip_sugar: "no sweet glaze — or the sauce on the side, please",
      swap_side: "salad or vegetables instead of the fries / white rice, please",
      skip_processed: "without the bacon / sausage / cured meat, please",
      light_salt: "easy on the salt, dressing on the side, please",
      add_greens: "and a side of greens or grilled vegetables, please",
    },
    simple: "simple, minimally processed",
    mixed: "mixed profile",
    // Plain-language NOVA. We used to print "NOVA 2" on the dish screen, which
    // is both jargon and — worse — a NUMBER. Displayed numbers are what users
    // argue with: across 341 negative reviews of rival menu apps, disputes over
    // a shown figure were the single largest accuracy complaint. The whole
    // design already refuses to show its 0-100 score; this closes the last gap.
    processing: {
      1: "minimally processed",
      2: "home-style cooking",
      3: "processed",
      4: "highly processed",
    },
  },
  ru: {
    tiers: {
      excellent: "Отлично",
      good: "Хорошо",
      fair: "Средне",
      poor: "Слабо",
      splurge: "Баловство",
    },
    benefits: {
      vegetables: "Основа — овощи",
      legumes: "Бобовые — основа рациона долгожителей",
      whole_grain: "Цельные злаки вместо рафинированных",
      omega3: "Источник омега-3",
      lean_protein: "Качественный постный белок",
      healthy_fat: "Полезные жиры (оливковое масло, орехи, авокадо)",
      polyphenols: "Богато полифенолами",
      fermented: "Содержит ферментированные продукты",
    },
    concerns: {
      deep_fried: "Во фритюре",
      ultra_processed: "Ультра-обработанные ингредиенты",
      processed_meat: "Переработанное мясо (бекон, колбаса, копчёности)",
      added_sugar_sauce: "Вероятен добавленный сахар в соусе или глазури",
      refined_carb_base: "Основа из рафинированных углеводов (белая мука, рис или фри)",
      high_sodium: "Заметно солёное (копчёное / солёное / много соевого соуса)",
      creamy_sauce: "Сливочный соус — скорее всего масло или сливки",
    },
    short: {
      vegetables: "овощи",
      legumes: "бобовые",
      whole_grain: "цельные злаки",
      omega3: "омега-3",
      lean_protein: "постный белок",
      healthy_fat: "полезные жиры",
      polyphenols: "полифенолы",
      fermented: "ферментированное",
      deep_fried: "фритюр",
      ultra_processed: "ультра-обработка",
      processed_meat: "переработанное мясо",
      added_sugar_sauce: "добавленный сахар",
      refined_carb_base: "рафинированные углеводы",
      high_sodium: "солёное",
      creamy_sauce: "сливочный соус",
    },
    methods: {
      grilled: "на гриле",
      steamed: "на пару",
      baked: "запечено",
      roasted: "из духовки",
      sauteed: "обжарено",
      fried: "жарено",
      raw: "свежее",
      boiled: "варёное",
      stewed: "тушёное",
      unknown: "неизвестно",
    },
    mods: {
      unfry: "Попросите приготовить на гриле или запечь вместо жарки",
      sauce_side: "Попросите сливочный соус отдельно — используйте немного",
      skip_sugar: "Без сладкой глазури / соус отдельно",
      swap_side: "Замените фри / белый рис / хлеб на салат или овощи",
      skip_processed: "Без бекона / колбасы / копчёностей",
      light_salt: "Попросите меньше соли, заправку отдельно",
      add_greens: "Добавьте порцию зелени или овощей на гриле",
    },
    scripts: {
      unfry: "на гриле или запечённым, без фритюра, пожалуйста",
      sauce_side: "сливочный соус отдельно, пожалуйста",
      skip_sugar: "без сладкой глазури — или соус отдельно, пожалуйста",
      swap_side: "вместо фри / белого риса — салат или овощи, пожалуйста",
      skip_processed: "без бекона / колбасных изделий, пожалуйста",
      light_salt: "поменьше соли, заправку отдельно, пожалуйста",
      add_greens: "и порцию зелени или овощей на гриле, пожалуйста",
    },
    simple: "простое, минимально обработанное",
    mixed: "смешанный профиль",
    processing: {
      1: "минимальная обработка",
      2: "домашняя кухня",
      3: "обработанное",
      4: "сильно обработанное",
    },
  },
};

const L = (lang) => LOCALES[lang] || LOCALES.en;

// Re-label a tier object for the given language (keys/colors never change).
export function localizedTier(tier, lang) {
  return { ...tier, label: L(lang).tiers[tier.key] || tier.label };
}

// NOVA level -> a word a diner actually understands. Never the raw number.
export function processingLabel(nova, lang = "en") {
  const loc = L(lang);
  return loc.processing[nova] || loc.processing[2];
}

export function reasonLine(facts, score, lang = "en") {
  const loc = L(lang);
  const positives = (facts.positives || []).slice(0, 2).map((p) => loc.short[p]);
  const concerns = concernKeys(facts.flags)
    .map((k) => loc.short[k])
    .slice(0, 2);
  const goodMethod = ["grilled", "steamed", "raw", "baked", "stewed"].includes(
    facts.cooking_method
  );
  const parts = [];
  if (score >= 65) {
    if (goodMethod) parts.push(loc.methods[facts.cooking_method] || facts.cooking_method);
    parts.push(...positives);
    if (parts.length === 0) parts.push(loc.simple);
  } else {
    parts.push(...concerns);
    if (positives.length && parts.length < 2) parts.push(positives[0]);
    if (parts.length === 0) parts.push(loc.mixed);
  }
  return parts.slice(0, 3).join(" · ");
}

// ---- Improvement engine -------------------------------------------------
// Each modification is a realistic, waiter-ready ask. Deltas are COMPUTED by
// re-running the engine with the change applied — never guessed.

const MOD_DEFS = [
  { id: "unfry", flag: "deep_fried" },
  { id: "sauce_side", flag: "creamy_sauce" },
  { id: "skip_sugar", flag: "added_sugar_sauce" },
  { id: "swap_side", flag: "refined_carb_base" },
  { id: "skip_processed", flag: "processed_meat" },
  { id: "light_salt", flag: "high_sodium" },
];

function flagActive(flags, name) {
  const f = normFlags(flags);
  return name === "processed_meat" ? f.processed_meat !== "none" : !!f[name];
}

export function applyMods(facts, modIds) {
  const flags = normFlags(facts.flags);
  const positives = [...(facts.positives || [])];
  for (const id of modIds) {
    const def = MOD_DEFS.find((m) => m.id === id);
    if (def) flags[def.flag] = def.flag === "processed_meat" ? "none" : false;
    if (id === "add_greens" && !positives.includes("vegetables"))
      positives.push("vegetables");
  }
  return { ...facts, flags, positives };
}

export function buildImprovements(facts, lang = "en") {
  const loc = L(lang);
  const base = computeScore(facts);
  const mods = [];
  for (const def of MOD_DEFS) {
    if (flagActive(facts.flags, def.flag)) {
      const delta = computeScore(applyMods(facts, [def.id])) - base;
      if (delta >= 2) mods.push({ id: def.id, label: loc.mods[def.id], delta });
    }
  }
  if (!(facts.positives || []).includes("vegetables")) {
    const delta = computeScore(applyMods(facts, ["add_greens"])) - base;
    if (delta >= 2)
      mods.push({ id: "add_greens", label: loc.mods.add_greens, delta });
  }
  return mods.sort((a, b) => b.delta - a.delta).slice(0, 4);
}

// Waiter-ready lines for the toggled asks, in menu order of impact.
export function scriptLines(dish, activeIds, lang = "en") {
  const loc = L(lang);
  return (dish.improvements || [])
    .filter((m) => activeIds.includes(m.id))
    .map((m) => loc.scripts[m.id])
    .filter(Boolean);
}

// ---- Full dish result ---------------------------------------------------

export function buildResult(raw, lang = "en") {
  const loc = L(lang);
  const facts = {
    positives: raw.positives || [],
    flags: normFlags(raw.flags),
    cooking_method: raw.cooking_method || "unknown",
  };
  const score = computeScore(facts);
  const tier = tierFor(score);
  return {
    name: raw.name,
    section: raw.section || "",
    ingredients: raw.ingredients || [],
    cooking_method: facts.cooking_method,
    nova: raw.nova || 2,
    confidence: raw.confidence || "medium",
    positives: facts.positives,
    flags: facts.flags,
    score, // internal only — powers ranking + live recalc, never displayed
    tier: {
      key: tier.key,
      label: loc.tiers[tier.key] || tier.label,
      color: tier.color,
    },
    reason: reasonLine(facts, score, lang),
    benefits: facts.positives.map((p) => loc.benefits[p]).filter(Boolean),
    concerns: concernKeys(facts.flags)
      .map((k) => loc.concerns[k])
      .filter(Boolean),
    improvements: buildImprovements(facts, lang),
  };
}

export function rankDishes(rawDishes, lang = "en") {
  return rawDishes
    .map((d) => buildResult(d, lang))
    .sort((a, b) => b.score - a.score)
    .map((d, i) => ({ ...d, rank: i + 1 }));
}
