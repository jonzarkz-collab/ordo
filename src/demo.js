// Demo menu: "Lokanta Deniz", a Turkish seafood and grill place. Runs entirely
// on-device through the same deterministic engine, so it works with no API key
// and no network: perfect for first impressions and restaurant dead zones.
//
// It is also the answer to the #1 rival request ("let me try it before
// paying"): most people install Ordo at home, nowhere near a menu, and a
// first-run screen with nothing to do but spend a free scan loses them. The
// sample is free forever and never touches the scan budget or history.
//
// 2.0: the sample is a FOREIGN menu, so the first thing a new user sees is the
// translator (printed name, translation, "what it is", Turkish waiter card).
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
    name: { en: "Red Lentil Soup", ru: "Суп из красной чечевицы" },
    original_name: "Mercimek Çorbası",
    about: { en: "Smooth red lentil soup with lemon, a Turkish staple.", ru: "Нежный суп из красной чечевицы с лимоном, турецкая классика." },
    section: { en: "Soups", ru: "Супы" },
    ingredients: {
      en: ["red lentils", "onion", "carrot", "butter", "lemon"],
      ru: ["красная чечевица", "лук", "морковь", "сливочное масло", "лимон"],
    },
    price: "₺180",
    contains: ["dairy"],
    cooking_method: "stewed",
    nova: 1,
    flags: F(),
    positives: ["legumes", "vegetables"],
    confidence: "high",
  },
  {
    name: { en: "Shepherd's Salad", ru: "Пастуший салат" },
    original_name: "Çoban Salatası",
    about: { en: "Chopped tomato, cucumber, onion and green pepper with olive oil and lemon.", ru: "Томаты, огурцы, лук и зелёный перец с оливковым маслом и лимоном." },
    section: { en: "Starters", ru: "Закуски" },
    ingredients: {
      en: ["tomato", "cucumber", "onion", "green pepper", "olive oil", "lemon"],
      ru: ["томат", "огурец", "лук", "зелёный перец", "оливковое масло", "лимон"],
    },
    price: "₺220",
    contains: [],
    is_meal: false,
    cooking_method: "raw",
    nova: 1,
    flags: F(),
    positives: ["vegetables", "healthy_fat", "polyphenols"],
    confidence: "high",
  },
  {
    name: { en: "Fried Calamari", ru: "Кальмары во фритюре" },
    original_name: "Kalamar Tava",
    about: { en: "Battered squid rings, deep-fried, with walnut tarator sauce.", ru: "Кольца кальмара в кляре, во фритюре, с ореховым соусом таратор." },
    section: { en: "Starters", ru: "Закуски" },
    ingredients: {
      en: ["squid", "white flour batter", "frying oil", "walnut tarator"],
      ru: ["кальмар", "кляр из белой муки", "фритюр", "соус таратор с грецким орехом"],
    },
    price: "₺380",
    contains: ["shellfish", "gluten", "nuts"],
    is_meal: false,
    cooking_method: "fried",
    nova: 3,
    flags: F({ deep_fried: true, refined_carb_base: true }),
    positives: [],
    confidence: "high",
  },
  {
    name: { en: "Grilled Sea Bass", ru: "Сибас на гриле" },
    original_name: "Izgara Levrek",
    about: { en: "Whole sea bass grilled over charcoal, with salad and lemon.", ru: "Целый сибас на углях, с салатом и лимоном." },
    section: { en: "Fish", ru: "Рыба" },
    ingredients: {
      en: ["sea bass", "olive oil", "lemon", "rocket", "onion"],
      ru: ["сибас", "оливковое масло", "лимон", "руккола", "лук"],
    },
    price: "₺620",
    contains: ["fish"],
    cooking_method: "grilled",
    nova: 1,
    flags: F(),
    positives: ["omega3", "lean_protein", "healthy_fat", "vegetables", "polyphenols"],
    confidence: "high",
  },
  {
    name: { en: "Chicken Shish", ru: "Куриный шиш-кебаб" },
    original_name: "Tavuk Şiş",
    about: { en: "Marinated chicken grilled on a skewer, with bulgur and grilled peppers.", ru: "Маринованная курица на шпажке, на углях, с булгуром и перцем." },
    section: { en: "Grill", ru: "Гриль" },
    ingredients: {
      en: ["chicken breast", "yoghurt marinade", "bulgur", "peppers", "tomato"],
      ru: ["куриная грудка", "йогуртовый маринад", "булгур", "перец", "томат"],
    },
    price: "₺450",
    contains: ["poultry", "gluten", "dairy"],
    cooking_method: "grilled",
    nova: 1,
    flags: F(),
    positives: ["lean_protein", "whole_grain", "vegetables"],
    confidence: "high",
  },
  {
    name: { en: "Iskender Kebab", ru: "Искендер-кебаб" },
    original_name: "İskender Kebap",
    about: { en: "Sliced doner over bread with tomato sauce, melted butter and yoghurt.", ru: "Дёнер на лепёшке с томатным соусом, растопленным маслом и йогуртом." },
    section: { en: "Grill", ru: "Гриль" },
    ingredients: {
      en: ["doner meat", "pide bread", "butter", "tomato sauce", "yoghurt"],
      ru: ["дёнер", "лепёшка пиде", "сливочное масло", "томатный соус", "йогурт"],
    },
    price: "₺540",
    contains: ["red_meat", "gluten", "dairy"],
    cooking_method: "roasted",
    nova: 3,
    flags: F({ processed_meat: "primary", refined_carb_base: true, high_sodium: true, creamy_sauce: true }),
    positives: [],
    confidence: "high",
  },
  {
    name: { en: "Künefe", ru: "Кюнефе" },
    original_name: "Künefe",
    about: { en: "Hot shredded-pastry dessert with melted cheese, syrup and pistachio.", ru: "Горячий десерт из теста кадаиф с сыром, сиропом и фисташкой." },
    section: { en: "Desserts", ru: "Десерты" },
    ingredients: {
      en: ["kadayif pastry", "cheese", "sugar syrup", "butter", "pistachio"],
      ru: ["тесто кадаиф", "сыр", "сахарный сироп", "сливочное масло", "фисташка"],
    },
    price: "₺260",
    contains: ["gluten", "dairy", "nuts"],
    is_meal: false,
    cooking_method: "baked",
    nova: 3,
    flags: F({ added_sugar_sauce: true, refined_carb_base: true }),
    positives: [],
    confidence: "high",
  },
];

// The waiter card's lines in Turkish, as the server returns them for a
// translated scan (WAITER_EN in api/scan.js, same keys).
const DEMO_PHRASES = {
  order: "Bir {dish}, lütfen.",
  unfry: "Kızartma yerine ızgara ya da fırında olabilir mi?",
  sauce_side: "Kremalı sos ayrı gelebilir mi?",
  skip_sugar: "Tatlı sos olmasın lütfen, ya da sos ayrı gelsin.",
  swap_side: "Patates kızartması, pilav ya da ekmek yerine salata veya sebze, lütfen.",
  skip_processed: "Pastırma, sucuk ya da işlenmiş et olmadan, lütfen.",
  light_salt: "Az tuzlu olsun, sosu da ayrı gelsin lütfen.",
  add_greens: "Yanına yeşillik ya da ızgara sebze de alabilir miyim?",
  vegetarian: "Vejetaryenim: et ya da balık yemiyorum, et suyu da olmasın.",
  pescatarian: "Et ve tavuk yemiyorum, balık olur.",
  no_pork: "Domuz eti olmasın lütfen; domuz pastırması, jambon ve domuz yağı da.",
  gluten_free: "Glüten yiyemiyorum. Mutfağa sorabilir misiniz?",
  dairy_free: "Süt ürünü yemiyorum: tereyağı, krema, peynir olmasın. Sorabilir misiniz?",
  no_nuts: "Fındık ve fıstık alerjim var. Lütfen içinde kuruyemiş olmadığından emin olun.",
};

const pick = (v, lang) => (v && typeof v === "object" && !Array.isArray(v) ? v[lang] || v.en : v);

function localDishes(lang) {
  return DEMO_DISHES.map((d) => ({
    ...d,
    name: pick(d.name, lang),
    section: pick(d.section, lang),
    ingredients: pick(d.ingredients, lang),
    about: pick(d.about, lang),
  }));
}

export const DEMO_RESTAURANT = "Lokanta Deniz";

export function demoResult(lang = "en") {
  return {
    restaurant: DEMO_RESTAURANT,
    demo: true,
    dishes: podiumFirst(rankDishes(localDishes(lang), lang)),
    menuLang: "tr",
    phrases: DEMO_PHRASES,
  };
}

// The printed menu as the Home preview draws it: menu order, names as printed
// (Turkish), with each line's eventual tier attached so the "scan" can reveal
// it in place.
export function demoMenuLines(lang = "en") {
  const ranked = demoResult(lang).dishes;
  return localDishes(lang).map((d) => {
    const r = ranked.find((x) => x.name === d.name);
    return { name: d.original_name, price: d.price, tier: r.tier, rank: r.rank };
  });
}
