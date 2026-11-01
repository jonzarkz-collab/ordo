// "My needs": diet and allergy preferences, set by tapping chips on a ranking.
// Never a quiz, never an account, saved on this device and applied to every
// menu. A dish that clashes is moved out of the ranking, never hidden, and an
// allergy is never declared "safe": the best Ordo can say is that a typical
// recipe doesn't contain it, and the waiter script asks the kitchen to check.

// Food groups a dish can contain. The model reports them per dish (`contains`
// in api/scan.js); everything else falls back to the keywords below.
export const GROUPS = [
  "red_meat",
  "pork",
  "poultry",
  "fish",
  "shellfish",
  "dairy",
  "gluten",
  "nuts",
];

export const NEEDS = [
  { id: "vegetarian", blocks: ["red_meat", "pork", "poultry", "fish", "shellfish"] },
  { id: "pescatarian", blocks: ["red_meat", "pork", "poultry"] },
  { id: "no_pork", blocks: ["pork"] },
  { id: "gluten_free", blocks: ["gluten"], allergy: "gluten" },
  { id: "dairy_free", blocks: ["dairy"], allergy: "dairy" },
  { id: "no_nuts", blocks: ["nuts"], allergy: "nuts" },
];

// Keyword fallback for results that predate `contains` (history, Menu Memory)
// and a second opinion on new ones. Each entry is a regex fragment matched at
// the START of a word, so "ham" can't fire inside "champagne"; a trailing
// (?!\p{L}) pins the end too, so "ham" doesn't fire on "hamburger" either. It
// deliberately errs toward "contains": a false alarm costs a dish, a miss
// costs trust.
const END = "(?!\\p{L})";
const WORDS = {
  red_meat: ["beef", "steak", "lamb", "mutton", "veal", "brisket", "burger", "meatball", "kebab", "говяд", "баран", "телят", "стейк", "бургер", "шашлык", "фрикадел", "люля"],
  pork: ["pork", "bacon", "ham" + END, "prosciutto", "pancetta", "salami", "pepperoni", "chorizo", "sausage", "lard", "свин", "бекон", "ветчин", "салями", "колбас", "сосис", "сардел", "сало" + END, "хамон", "пепперони", "чоризо", "буженин"],
  poultry: ["chicken", "turkey", "duck", "куриц", "курин", "цыпл", "индей", "утк", "утин"],
  fish: ["fish", "salmon", "tuna", "cod" + END, "trout", "anchov", "bass" + END, "halibut", "mackerel", "sardine", "herring", "рыб", "лосос", "тунец", "тунц", "треск", "форел", "анчоус", "сёмг", "семг", "скумбри", "сельд", "судак"],
  shellfish: ["shrimp", "prawn", "lobster", "crab", "squid", "calamari", "octopus", "mussel", "clam", "oyster", "scallop", "seafood", "кревет", "омар", "краб", "кальмар", "осьмин", "миди", "устриц", "гребеш", "морепродукт"],
  dairy: ["cheese", "cheddar", "feta", "parmesan", "mozzarella", "ricotta", "halloumi", "cream", "butter", "milk", "yogh?urt", "tzatziki", "ghee", "alfredo", "сыр", "фета", "пармезан", "моцарелл", "сливк", "сливоч", "молок", "молоч", "йогурт", "сметан", "творог", "дзадзики", "кефир", "курут", "брынз"],
  gluten: ["pasta", "spaghetti", "penne", "lasagn", "bread", "bun" + END, "buns" + END, "pita", "flour", "batter", "breaded", "breadcrumb", "crouton", "noodle", "tortilla", "farro", "barley", "couscous", "bulgur", "wheat", "seitan", "soy sauce", "pizza", "dumpling", "pastry", "cake", "brownie", "паст[аы]", "спагетти", "лазань", "хлеб", "булоч", "булк", "пит[аы]" + END, "мук", "кляр", "панир", "сухар", "гренк", "лапш", "фарро", "ячмен", "кускус", "булгур", "пшени", "соев", "пицц", "пельмен", "манты", "лаваш", "торт", "тест", "фатир", "лепёш", "лепеш"],
  nuts: ["nuts?" + END, "walnut", "peanut", "hazelnut", "almond", "cashew", "pistachio", "pecan", "pesto", "praline", "satay", "macadamia", "орех", "миндал", "фисташ", "кешью", "арахис", "песто", "фундук", "пекан"],
};
const RE = Object.fromEntries(
  Object.entries(WORDS).map(([g, ws]) => [
    g,
    new RegExp(`(^|[^\\p{L}])(${ws.join("|")})`, "iu"),
  ])
);

export function dishGroups(dish) {
  const found = new Set(
    (Array.isArray(dish.contains) ? dish.contains : []).filter((g) => GROUPS.includes(g))
  );
  const text = [dish.name, ...(dish.ingredients || [])].join(" · ").toLowerCase();
  for (const g of GROUPS) if (RE[g].test(text)) found.add(g);
  return [...found];
}

// The food groups in this dish that the diner's needs rule out.
export function conflicts(dish, needs) {
  if (!needs.length) return [];
  const blocked = new Set(
    NEEDS.filter((n) => needs.includes(n.id)).flatMap((n) => n.blocks)
  );
  return dishGroups(dish).filter((g) => blocked.has(g));
}

// Splits a ranking into what fits and what doesn't, renumbering the fits so
// the podium is "best for YOU", not the overall top three with gaps in it.
export function fitDishes(dishes, needs) {
  if (!needs.length) return { fit: dishes, misfit: [] };
  const fit = [];
  const misfit = [];
  for (const d of dishes) {
    const c = conflicts(d, needs);
    if (c.length) misfit.push({ ...d, clash: c });
    else fit.push(d);
  }
  return { fit: fit.map((d, i) => ({ ...d, rank: i + 1 })), misfit };
}

// The allergy groups the diner asked about, for "ask your server" copy.
export function allergyGroups(needs) {
  return NEEDS.filter((n) => n.allergy && needs.includes(n.id)).map((n) => n.allergy);
}

const NEEDS_KEY = "ordo_needs_v1";

export function loadNeeds() {
  try {
    const v = JSON.parse(localStorage.getItem(NEEDS_KEY));
    return Array.isArray(v) ? v.filter((id) => NEEDS.some((n) => n.id === id)) : [];
  } catch {
    return [];
  }
}

export function saveNeeds(needs) {
  try {
    localStorage.setItem(NEEDS_KEY, JSON.stringify(needs));
  } catch {
    /* private mode — needs still apply for this session */
  }
}
