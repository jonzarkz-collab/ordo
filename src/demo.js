// Demo menu — "Olive & Ember", a Mediterranean grill. Runs entirely on-device
// through the same deterministic engine, so it works with no API key and no
// network: perfect for first impressions and restaurant dead zones.
import { rankDishes } from "./lib/engine.js";

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

const DEMO_DISHES = [
  {
    name: "Grilled Salmon, Lentils & Greens",
    section: "Mains",
    ingredients: ["salmon", "lentils", "spinach", "olive oil", "lemon", "herbs"],
    cooking_method: "grilled",
    nova: 1,
    flags: F(),
    positives: ["omega3", "legumes", "vegetables", "healthy_fat", "lean_protein", "polyphenols"],
    confidence: "high",
  },
  {
    name: "Roasted Vegetable & Farro Bowl",
    section: "Mains",
    ingredients: ["farro", "zucchini", "peppers", "chickpeas", "olive oil", "feta"],
    cooking_method: "roasted",
    nova: 1,
    flags: F({ high_sodium: true }),
    positives: ["whole_grain", "vegetables", "legumes", "healthy_fat", "polyphenols"],
    confidence: "high",
  },
  {
    name: "Chicken Souvlaki Plate",
    section: "Mains",
    ingredients: ["chicken breast", "pita", "tzatziki", "tomato", "onion"],
    cooking_method: "grilled",
    nova: 2,
    flags: F({ refined_carb_base: true }),
    positives: ["lean_protein", "vegetables", "fermented"],
    confidence: "high",
  },
  {
    name: "Greek Salad",
    section: "Starters",
    ingredients: ["tomato", "cucumber", "feta", "olives", "olive oil", "oregano"],
    cooking_method: "raw",
    nova: 1,
    flags: F({ high_sodium: true }),
    positives: ["vegetables", "healthy_fat", "polyphenols"],
    confidence: "high",
  },
  {
    name: "Creamy Chicken Alfredo",
    section: "Pasta",
    ingredients: ["white pasta", "cream", "butter", "parmesan", "chicken"],
    cooking_method: "sauteed",
    nova: 3,
    flags: F({ creamy_sauce: true, refined_carb_base: true, high_sodium: true }),
    positives: ["lean_protein"],
    confidence: "high",
  },
  {
    name: "Crispy Calamari",
    section: "Starters",
    ingredients: ["squid", "white flour batter", "frying oil", "aioli"],
    cooking_method: "fried",
    nova: 3,
    flags: F({ deep_fried: true, refined_carb_base: true, creamy_sauce: true }),
    positives: [],
    confidence: "high",
  },
  {
    name: "Smokehouse Bacon Burger",
    section: "Grill",
    ingredients: ["beef patty", "bacon", "white bun", "cheddar", "BBQ sauce", "fries"],
    cooking_method: "grilled",
    nova: 4,
    flags: F({ processed_meat: "garnish", refined_carb_base: true, added_sugar_sauce: true, high_sodium: true, ultra_processed: true }),
    positives: [],
    confidence: "high",
  },
  {
    name: "Chocolate Lava Cake",
    section: "Desserts",
    ingredients: ["chocolate", "sugar", "white flour", "butter", "cream"],
    cooking_method: "baked",
    nova: 4,
    flags: F({ added_sugar_sauce: true, refined_carb_base: true, creamy_sauce: true, ultra_processed: true }),
    positives: [],
    confidence: "high",
  },
];

export function demoResult(lang = "en") {
  return { restaurant: "Olive & Ember (demo)", dishes: rankDishes(DEMO_DISHES, lang) };
}
