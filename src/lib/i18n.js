// UI strings — EN / RU. Engine-produced text (tiers, reasons, asks, waiter
// scripts) lives in engine.js LOCALES; this file covers everything else on
// screen. Icons are SVG components (icons.jsx) — labels stay emoji-free.

export const UI = {
  en: {
    tagline: "Know what to order.",
    subtitle:
      "Scan any menu — see the best choices for long-term health, ranked in seconds.",
    scan: "Scan a menu",
    recent: "Recent",
    allScans: (n) => `All scans (${n})`,
    disclaimer:
      "Ordo gives general wellness information to help you choose. It is not medical advice and does not diagnose, treat, or prevent any disease. Rankings are estimates based on typical recipes — actual dishes vary.",
    processing: [
      "Reading the menu…",
      "Identifying every dish…",
      "Inferring ingredients & cooking methods…",
      "Checking processing levels…",
      "Ranking for long-term health…",
    ],
    processingHint: "Usually under 30 seconds",
    newScan: "New scan",
    thisMenu: "This menu",
    bestChoices: "Best choices here",
    weakMenu:
      "Honest verdict: no strong dishes on this menu. But an order can be rescued — tap a dish.",
    showAll: (n) => `Show all ${n} dishes`,
    hide: "Hide",
    tapHint: "Tap any dish to see why — and how to order it better.",
    backResults: "Results",
    confidence: "confidence",
    confidenceVals: { high: "high", medium: "medium", low: "low" },
    whatsInIt: "What's in it",
    goingForIt: "Going for it",
    worthKnowing: "Worth knowing",
    betterHere: "Better on this menu",
    makeItBetter: "Make it better",
    improveSub: "Simple asks your server can actually do:",
    nice: "nice!",
    alreadyStrong: "Already a strong order",
    alreadyStrongSub: "No changes needed — this one is solid as it comes.",
    possible: "possible — tap the asks above",
    // v2.0
    timeoutError:
      "That menu was big and took too long. Try again — or photograph one section at a time.",
    instant: "Instant — Ordo remembers this menu",
    waiter: "Show the waiter",
    scriptOpener: "Could I have…",
    scriptHint: "Show this screen to your server",
    orderThis: "I'm ordering this",
    counted: (n) => `Better order #${n}`,
    enjoy: "Enjoy!",
    close: "Close",
    betterOrders: (n) => (n === 1 ? "1 better order" : `${n} better orders`),
    lastPick: (name) => `Last: ${name}`,
    // v3.0 — scans & packs
    freeLeft: (n) => (n === 1 ? "1 free scan left" : `${n} free scans left`),
    scansLeft: (n) => (n === 1 ? "1 scan left" : `${n} scans left`),
    outTitle: "You've used your free scans",
    outSub: (n) =>
      `Your ${n} free scans are used. Add scans that never expire — one-time purchase, no subscription.`,
    packCredits: (n) => `${n} scans`,
    packNote: "One-time purchase · never expires · no subscription",
    restore: "Restore purchase",
    // Shown after a purchase so the user sees WHAT was added, not just a new
    // total. Without it, correct lifetime accumulation (buy 25 twice, see 50)
    // is indistinguishable from a billing bug — which is exactly how it was
    // first reported.
    creditsAdded: (n) => `${n} scans added`,
    restored: (n) => `Restored — ${n} scans on this account`,
    restoreNone: "No previous purchase found on this Apple ID.",
    packsUnavailable: "The store isn't reachable right now. Try again shortly.",
    maybeLater: "Not now",
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    purchaseFailed: "That purchase didn't go through. You haven't been charged.",
    noSubscription: "No subscription. No free trial. Nothing auto-renews.",
    // Shown on every screen that states a verdict. The store name says
    // "Longevity", so the not-medical-advice line has to travel with the
    // rankings rather than sitting only on the home screen.
    disclaimerShort:
      "General wellness information — not medical advice. Estimates based on typical recipes.",
  },
  ru: {
    tagline: "Знай, что заказать.",
    subtitle:
      "Сканируй любое меню — лучшие блюда для здоровья и долголетия, за секунды.",
    scan: "Сканировать меню",
    recent: "Недавние",
    allScans: (n) => `Все сканы (${n})`,
    disclaimer:
      "Ordo даёт общую информацию о питании и помогает с выбором. Это не медицинский совет: сервис не диагностирует, не лечит и не предотвращает заболевания. Оценки основаны на типичных рецептах — реальные блюда могут отличаться.",
    processing: [
      "Читаю меню…",
      "Определяю каждое блюдо…",
      "Оцениваю ингредиенты и способы приготовления…",
      "Проверяю степень обработки…",
      "Составляю рейтинг для долголетия…",
    ],
    processingHint: "Обычно до 30 секунд",
    newScan: "Новый скан",
    thisMenu: "Это меню",
    bestChoices: "Лучший выбор здесь",
    weakMenu:
      "Честно: сильных блюд здесь нет. Но заказ можно спасти — нажмите на блюдо.",
    showAll: (n) => `Показать все блюда (${n})`,
    hide: "Скрыть",
    tapHint: "Нажмите на блюдо — почему такой рейтинг и как заказать лучше.",
    backResults: "Результаты",
    confidence: "уверенность",
    confidenceVals: { high: "высокая", medium: "средняя", low: "низкая" },
    whatsInIt: "Что внутри",
    goingForIt: "В плюс",
    worthKnowing: "Стоит знать",
    betterHere: "Лучше в этом меню",
    makeItBetter: "Сделать лучше",
    improveSub: "Простые просьбы, которые официант может выполнить:",
    nice: "отлично!",
    alreadyStrong: "Уже отличный выбор",
    alreadyStrongSub: "Менять ничего не нужно — блюдо хорошо как есть.",
    possible: "возможно — отметьте просьбы выше",
    // v2.0
    timeoutError:
      "Меню оказалось большим, и анализ не успел завершиться. Попробуйте ещё раз — или сфотографируйте меню по частям.",
    instant: "Мгновенно — Ordo помнит это меню",
    waiter: "Показать официанту",
    scriptOpener: "Будьте добры…",
    scriptHint: "Покажите этот экран официанту",
    orderThis: "Я заказываю это",
    counted: (n) => `Заказ в плюс №${n}`,
    enjoy: "Приятного!",
    close: "Закрыть",
    betterOrders: (n) => `Заказов в плюс: ${n}`,
    lastPick: (name) => `Последний: ${name}`,
    // v3.0 — сканы и пакеты
    freeLeft: (n) => `Бесплатных сканов: ${n}`,
    scansLeft: (n) => `Осталось сканов: ${n}`,
    outTitle: "Бесплатные сканы закончились",
    outSub: (n) =>
      `${n} бесплатных скана использованы. Добавьте сканы, которые не сгорают — разовая покупка, без подписки.`,
    packCredits: (n) => `${n} сканов`,
    packNote: "Разовая покупка · не сгорает · без подписки",
    restore: "Восстановить покупку",
    creditsAdded: (n) => `Добавлено сканов: ${n}`,
    restored: (n) => `Восстановлено — сканов на аккаунте: ${n}`,
    restoreNone: "Прошлых покупок на этом Apple ID не найдено.",
    packsUnavailable: "Магазин сейчас недоступен. Попробуйте чуть позже.",
    maybeLater: "Не сейчас",
    terms: "Условия использования",
    privacy: "Политика конфиденциальности",
    purchaseFailed: "Покупка не прошла. Деньги не списаны.",
    noSubscription: "Без подписки. Без пробного периода. Ничего не продлевается.",
    disclaimerShort:
      "Общая информация о питании — не медицинский совет. Оценки основаны на типичных рецептах.",
  },
};

const LANG_KEY = "ordo_lang";

export function getLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "ru") return saved;
  } catch {
    /* private mode */
  }
  const nav = (typeof navigator !== "undefined" && navigator.language) || "en";
  return /^(ru|tg|uk|kk|ky|uz|be)/i.test(nav) ? "ru" : "en";
}

export function saveLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* optional */
  }
}
