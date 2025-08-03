// src/locales/en/attempts.ts - Обновленный английский файл с уведомлениями и кнопкой

export const attempts = {
  current: "ATTEMPTS",
  resetTime: "RESET TIME",

  // Добавляем секцию для уведомлений о восстановлении
  notifications: {
    restored: {
      title: "⚡ Attempts restored!",
      greeting: "Yo, {firstName}! Your game attempts have been restored.",
      attemptsAwarded: "🎮 +{attemptsRestored} attempts are now available!",
      encouragement: "You can continue playing. If you want, of course. Want.",
      fullMessage:
        "🎮 <b>Attempts restored!</b>\n\nYo, {firstName}! Your game attempts have been restored.\n\n⚡ <b>+{attemptsRestored} attempts</b> are now available!",
      // Добавляем текст для кнопки
      playButton: "🎮 Play Now",
    },
  },

  modal: {
    title: "ATTEMPTS SYSTEM",
    noAttemptsLeft: "No attempts remaining",
    attemptsRemaining: "{count} attempts remaining",
    nextReset: "NEXT RESET",
    resetNow: "Resetting now...",
    resetInHours: "In {hours}h {minutes}m",
    resetInMinutes: "In {minutes} minutes",

    howItWorks: "HOW ATTEMPTS WORK",
    rule1: "Each game mode requires one attempt to play",
    rule2: "Attempts automatically reset every 2 hours",
    rule3:
      "You start with 10 attempts (and maybe more if you followed someone's ref) and can get free ones by leveling up",
    rule4: "If you have premium in Telegram, then you're great.",

    whyImportant: "WHY ATTEMPTS MATTER",
    importance1:
      "Think of attempts as your daily gaming energy. They prevent you from becoming a mindless clicking zombie who forgets to eat, sleep, or acknowledge the existence of other humans.",
    importance2:
      "This system encourages you to play strategically rather than just mashing buttons like a caffeinated hamster. Quality over quantity, as they say in fancy business meetings.",
    importance3:
      "Plus, it gives you time to contemplate your life choices between games. You're welcome for this profound philosophical opportunity.",

    needMore: "NEED MORE ATTEMPTS?",
    shopDescription:
      "Our AMAZING store offers additional attempts for those who just can't wait for the natural reset.",
    shopDisclaimer: "No real money required - just measly Telegram Stars.",
    visitShop: "SHOP",

    automaticReset:
      "Attempts are reset automatically every 2 hours. No action is required on your part.",
    fairPlay:
      "The system is designed to maintain fair play and prevent excessive gaming sessions. We care about you. We care about your houseplants, by the way.",
  },
} as const;
