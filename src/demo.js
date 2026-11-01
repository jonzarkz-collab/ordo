// Demo menu — "Olive & Ember", a Mediterranean grill. Runs entirely on-device
// through the same deterministic engine, so it works with no API key and no
// network: perfect for first impressions and restaurant dead zones.
//
// It is also the answer to the #1 rival request ("let me try it before
// paying"): most people install Ordo at home, nowhere near a menu, and a
// first-run screen with nothing to do but spend a free scan loses them. The
// sample is free forever and never touches the scan budget or history.
import { rankDishes, podiumFirst } from "./lib/engine.js";

const F = (over = {}) => ({
  deep_fried: false,
  processed_meat: "none", // v2.0: "none" | "garnish" | "primary"
  added_sugar_sauce: false,
  refined_carb_base: false,
  high_sodium: false,
  creamy_sauce: false,
  ultra_processed: false,
  ...over,
});

// Names, sections and ingredients carry both languages so a Russian-speaking
// first run doesn't land on an English menu. Listed in MENU order (as printed),
// which is what the Home preview shows before the ranking reshuffles it.
const DEMO_DISHES = [
  {
    name: { en: "Crispy Calamari", ru: "Хрустящие кальмары" },
    section: { en: "Starters", ru: "Закуски" },
    ingredients: {
      en: ["squid", "white flour batter", "frying oil", "aioli"],
      ru: ["кальмар", "кляр из белой муки", "фритюр", "айоли"],
    },
    price: "$14",
    contains: ["shellfish", "gluten"],
    is_meal: false,
    cooking_method: "fried",
    nova: 3,
    flags: F({ deep_fried: true, refined_carb_base: true, creamy_sauce: true }),
    positives: [],
    confidence: "high",
  },
  {
    name: { en: "Greek Salad", ru: "Греческий салат" },
    section: { en: "Starters", ru: "Закуски" },
    ingredients: {
      en: ["tomato", "cucumber", "feta", "olives", "olive oil", "oregano"],
      ru: ["томат", "огурец", "фета", "оливки", "оливковое масло", "орегано"],
    },
    price: "$12",
    contains: ["dairy"],
    is_meal: false,
    cooking_method: "raw",
    nova: 1,
    flags: F({ high_sodium: true }),
    positives: ["vegetables", "healthy_fat", "polyphenols"],
    confidence: "high",
  },
  {
    name: { en: "Grilled Salmon, Lentils & Greens", ru: "Лосось на гриле, чечевица и зелень" },
    section: { en: "Mains", ru: "Основные" },
    ingredients: {
      en: ["salmon", "lentils", "spinach", "olive oil", "lemon", "herbs"],
      ru: ["лосось", "чечевица", "шпинат", "оливковое масло", "лимон", "травы"],
    },
    price: "$24",
    contains: ["fish"],
    cooking_method: "grilled",
    nova: 1,
    flags: F(),
    positives: ["omega3", "legumes", "vegetables", "healthy_fat", "lean_protein", "polyphenols"],
    confidence: "high",
  },
  {
    name: { en: "Roasted Vegetable & Farro Bowl", ru: "Боул с фарро и печёными овощами" },
    section: { en: "Mains", ru: "Основные" },
    ingredients: {
      en: ["farro", "zucchini", "peppers", "chickpeas", "olive oil", "feta"],
      ru: ["фарро", "цукини", "перец", "нут", "оливковое масло", "фета"],
    },
    price: "$17",
    contains: ["gluten", "dairy"],
    cooking_method: "roasted",
    nova: 1,
    flags: F({}),
    positives: ["whole_grain", "vegetables", "legumes", "healthy_fat", "polyphenols"],
    confidence: "high",
  },
  {
    name: { en: "Chicken Souvlaki Plate", ru: "Сувлаки из курицы" },
    section: { en: "Mains", ru: "Основные" },
    ingredients: {
      en: ["chicken breast", "pita", "tzatziki", "tomato", "onion"],
      ru: ["куриная грудка", "пита", "дзадзики", "томат", "лук"],
    },
    price: "$19",
    contains: ["poultry", "gluten", "dairy"],
    cooking_method: "grilled",
    nova: 2,
    flags: F({ refined_carb_base: true }),
    positives: ["lean_protein", "vegetables", "fermented"],
    confidence: "high",
  },
  {
    name: { en: "Creamy Chicken Alfredo", ru: "Паста Альфредо с курицей" },
    section: { en: "Pasta", ru: "Паста" },
    ingredients: {
      en: ["white pasta", "cream", "butter", "parmesan", "chicken"],
      ru: ["паста из белой муки", "сливки", "сливочное масло", "пармезан", "курица"],
    },
    price: "$21",
    contains: ["poultry", "gluten", "dairy"],
    cooking_method: "sauteed",
    nova: 3,
    flags: F({ creamy_sauce: true, refined_carb_base: true, high_sodium: true }),
    positives: ["lean_protein"],
    confidence: "high",
  },
  {
    name: { en: "Smokehouse Bacon Burger", ru: "Бургер с беконом" },
    section: { en: "Grill", ru: "Гриль" },
    ingredients: {
      en: ["beef patty", "bacon", "white bun", "cheddar", "BBQ sauce", "fries"],
      ru: ["говяжья котлета", "бекон", "булочка", "чеддер", "соус барбекю", "картофель фри"],
    },
    price: "$18",
    contains: ["red_meat", "pork", "gluten", "dairy"],
    cooking_method: "grilled",
    nova: 4,
    flags: F({ processed_meat: "garnish", refined_carb_base: true, added_sugar_sauce: true, high_sodium: true, ultra_processed: true }),
    positives: [],
    confidence: "high",
  },
  {
    name: { en: "Chocolate Lava Cake", ru: "Шоколадный фондан" },
    section: { en: "Desserts", ru: "Десерты" },
    ingredients: {
      en: ["chocolate", "sugar", "white flour", "butter", "cream"],
      ru: ["шоколад", "сахар", "белая мука", "сливочное масло", "сливки"],
    },
    price: "$11",
    contains: ["gluten", "dairy"],
    is_meal: false,
    cooking_method: "baked",
    nova: 4,
    flags: F({ added_sugar_sauce: true, refined_carb_base: true, creamy_sauce: true, ultra_processed: true }),
    positives: [],
    confidence: "high",
  },
];

const pick = (v, lang) => (v && typeof v === "object" && !Array.isArray(v) ? v[lang] || v.en : v);

function localDishes(lang) {
  return DEMO_DISHES.map((d) => ({
    ...d,
    name: pick(d.name, lang),
    section: pick(d.section, lang),
    ingredients: pick(d.ingredients, lang),
  }));
}

export const DEMO_RESTAURANT = "Olive & Ember";

export function demoResult(lang = "en") {
  return { restaurant: DEMO_RESTAURANT, demo: true, dishes: podiumFirst(rankDishes(localDishes(lang), lang)) };
}

// The printed menu as the Home preview draws it: menu order, with each line's
// eventual tier attached so the "scan" can reveal it in place.
export function demoMenuLines(lang = "en") {
  const ranked = demoResult(lang).dishes;
  return localDishes(lang).map((d) => {
    const r = ranked.find((x) => x.name === d.name);
    return { name: d.name, price: d.price, tier: r.tier, rank: r.rank };
  });
}
