// UI strings — EN / RU. Engine-produced text (tiers, reasons, asks, waiter
// scripts) lives in engine.js LOCALES; this file covers everything else on
// screen. Icons are SVG components (icons.jsx) — labels stay emoji-free.

// "pork", "pork and gluten", "pork, dairy and gluten"
function andList(items, word) {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${word} ${items[items.length - 1]}`;
}

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
    // Round 5 — the paywall leads with a receipt of what the free scans did
    receiptHead: "Your free scans",
    rcMenus: "Menus ranked",
    rcDishes: "Dishes sorted",
    rcOrders: "Better orders",
    rcPicks: "Your #1 picks",
    rcCost: "Cost",
    rcFree: "Free",
    keepTitle: "Keep every menu this easy",
    keepSub: "Your next menu is one tap away. Add scans that never expire.",
    leftSub: "Add more whenever you like. Scans never expire and nothing renews.",
    perMenu: (p) => `${p} a menu`,
    bestDeal: (pct) => `Best value · save ${pct}%`,
    // restore / restored / restoreNone deleted with the restore button —
    // "No previous purchase found on this Apple ID." is the exact string
    // App Review screenshotted when rejecting build 1.0 (15) under 3.1.1.
    // Shown after a purchase so the user sees WHAT was added, not just a new
    // total. Without it, correct lifetime accumulation (buy 25 twice, see 50)
    // is indistinguishable from a billing bug — which is exactly how it was
    // first reported.
    creditsAdded: (n) => `${n} scans added`,
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
    // 1.0.2 — price + best value
    bestValue: "Best value",
    bestValueSub: "The lowest-priced meal rated Good or better",
    topPick: "Top pick",
    // First-run sample menu
    sampleKind: "Mediterranean grill",
    sampleTry: "No menu nearby? Tap to try this one",
    sampleReading: "Ranking it…",
    sampleBadge: "Sample menu",
    sampleBanner: "That's a sample. Your own menu works the same way.",
    scanYours: "Scan your menu",
    // Live ranking (processing screen)
    liveFound: (n) => (n === 1 ? "1 dish ranked so far…" : `${n} dishes ranked so far…`),
    liveHint: "Best first. It updates as Ordo reads.",
    liveMore: (n) => `+${n} more`,
    // My needs (diet / allergy chips)
    needsLabel: "My needs",
    needNames: {
      vegetarian: "Vegetarian",
      pescatarian: "Pescatarian",
      no_pork: "No pork",
      gluten_free: "Gluten-free",
      dairy_free: "Dairy-free",
      no_nuts: "Nut allergy",
    },
    needsSaved: "Saved on this phone · applied to every menu",
    misfitTitle: (n) => `Doesn't fit your needs (${n})`,
    groups: {
      red_meat: "meat",
      pork: "pork",
      poultry: "poultry",
      fish: "fish",
      shellfish: "seafood",
      dairy: "dairy",
      gluten: "gluten",
      nuts: "nuts",
    },
    contains: (gs) => `Likely contains ${andList(gs, "and")}`,
    likelyContains: (gs) =>
      `Likely contains ${andList(gs, "and")}, so it doesn't fit your needs. Ask your server what they can change.`,
    allergyNote: (gs) =>
      `A typical recipe has no ${andList(gs, "or")}, but kitchens vary. Always confirm with your server.`,
    nothingFits:
      "Nothing here clearly fits your needs. Ask your server: kitchens can often adapt a dish.",
    needScript: {
      vegetarian: "I'm vegetarian: no meat or fish, including the stock.",
      pescatarian: "No meat or poultry for me, fish is fine.",
      no_pork: "No pork, please, including bacon, ham or lard.",
      gluten_free: "I can't have gluten. Could you check with the kitchen?",
      dairy_free: "No dairy for me: no butter, cream or cheese. Could you check?",
      no_nuts: "I have a nut allergy. Please make sure there are no nuts.",
    },
    // Order moment + share with the table
    share: "Share this ranking",
    shareKicker: "What to order at",
    shareMyOrder: "My order",
    shareFooter: "Scan any menu with Ordo",
    shareFooterSub: "Ranked for long-term health · general wellness info, not medical advice",
    shareText: (r) => `What to order at ${r}, ranked for long-term health by Ordo.`,
    shareSaved: "Image saved · link copied",
    sendTable: "Send the ranking to the table",
    done: "Done",
    momentFirst: "Your first better order. The ring fills as they add up.",
    momentNext: (left, next) => `${left} more to ${next} better orders`,
    momentMilestone: (n) => `Milestone: ${n} better orders`,
    momentImproved: "with your asks",
    momentLine: "Small swaps, made often, are what add up.",
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
    receiptHead: "Ваши бесплатные сканы",
    rcMenus: "Меню разобрано",
    rcDishes: "Блюд отсортировано",
    rcOrders: "Заказов в плюс",
    rcPicks: "Ваш выбор №1",
    rcCost: "Стоимость",
    rcFree: "Бесплатно",
    keepTitle: "Пусть каждое меню будет таким же простым",
    keepSub: "Следующее меню — в одно касание. Добавьте сканы, которые не сгорают.",
    leftSub: "Докупайте когда удобно. Сканы не сгорают, ничего не продлевается.",
    perMenu: (p) => `${p} за меню`,
    bestDeal: (pct) => `Выгоднее на ${pct}%`,
    creditsAdded: (n) => `Добавлено сканов: ${n}`,
    packsUnavailable: "Магазин сейчас недоступен. Попробуйте чуть позже.",
    maybeLater: "Не сейчас",
    terms: "Условия использования",
    privacy: "Политика конфиденциальности",
    purchaseFailed: "Покупка не прошла. Деньги не списаны.",
    noSubscription: "Без подписки. Без пробного периода. Ничего не продлевается.",
    disclaimerShort:
      "Общая информация о питании — не медицинский совет. Оценки основаны на типичных рецептах.",
    bestValue: "Лучшая цена",
    bestValueSub: "Самое недорогое основное блюдо с оценкой «Хорошо» и выше",
    topPick: "Выбор №1",
    sampleKind: "Средиземноморский гриль",
    sampleTry: "Меню нет под рукой? Попробуйте на этом",
    sampleReading: "Составляю рейтинг…",
    sampleBadge: "Пример меню",
    sampleBanner: "Это пример. С вашим меню всё работает так же.",
    scanYours: "Сканировать своё меню",
    liveFound: (n) => `Уже в рейтинге: ${n}…`,
    liveHint: "Лучшие сверху. Список обновляется по ходу чтения.",
    liveMore: (n) => `и ещё ${n}`,
    needsLabel: "Учесть",
    needNames: {
      vegetarian: "Вегетарианское",
      pescatarian: "Без мяса, рыба можно",
      no_pork: "Без свинины",
      gluten_free: "Без глютена",
      dairy_free: "Без молочного",
      no_nuts: "Аллергия на орехи",
    },
    needsSaved: "Сохранено на телефоне · для всех меню",
    misfitTitle: (n) => `Вам не подходит (${n})`,
    // Винительный падеж — «содержит свинину»
    groups: {
      red_meat: "мясо",
      pork: "свинину",
      poultry: "птицу",
      fish: "рыбу",
      shellfish: "морепродукты",
      dairy: "молочное",
      gluten: "глютен",
      nuts: "орехи",
    },
    contains: (gs) => `Скорее всего, содержит ${andList(gs, "и")}`,
    likelyContains: (gs) =>
      `Скорее всего, содержит ${andList(gs, "и")}, поэтому вам не подходит. Спросите официанта, что можно изменить.`,
    allergyNote: (gs) =>
      // Allergy groups (глютен, молочное, орехи) read the same in both cases.
      `${gs.join(", ").replace(/^./, (c) => c.toUpperCase())}: в типичном рецепте этого нет. Но кухни бывают разные, всегда уточняйте у официанта.`,
    nothingFits:
      "Здесь нет блюд, которые точно вам подходят. Спросите официанта: кухня часто может адаптировать блюдо.",
    needScript: {
      vegetarian: "Я вегетарианец: без мяса и рыбы, в том числе без мясного бульона.",
      pescatarian: "Мне без мяса и птицы, рыбу можно.",
      no_pork: "Без свинины, пожалуйста, в том числе без бекона, ветчины и сала.",
      gluten_free: "Мне нельзя глютен. Уточните, пожалуйста, на кухне.",
      dairy_free: "Мне без молочного: без сливочного масла, сливок и сыра. Уточните, пожалуйста.",
      no_nuts: "У меня аллергия на орехи. Пожалуйста, убедитесь, что их нет.",
    },
    share: "Поделиться рейтингом",
    shareKicker: "Что заказать в",
    shareMyOrder: "Мой заказ",
    shareFooter: "Сканируйте любое меню в Ordo",
    shareFooterSub: "Рейтинг для долголетия · общая информация, не медицинский совет",
    shareText: (r) => `Что заказать в «${r}»: рейтинг для долголетия от Ordo.`,
    shareSaved: "Картинка сохранена · ссылка скопирована",
    sendTable: "Отправить рейтинг друзьям за столом",
    done: "Готово",
    momentFirst: "Ваш первый заказ в плюс. Кольцо заполняется с каждым следующим.",
    momentNext: (left, next) => `Ещё ${left} до ${next} заказов в плюс`,
    momentMilestone: (n) => `Рубеж: ${n} заказов в плюс`,
    momentImproved: "с вашими просьбами",
    momentLine: "Маленькие замены, сделанные часто, складываются в итог.",
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
