// src/locales/ru/tasks.ts - Updated with differentiated reward system

export const tasks = {
  // Основные элементы
  title: "ЗАДАНИЯ",
  subtitle: "Выполняйте задания для получения наград",
  loading: "Загрузка заданий...",
  refresh: "Обновить",

  // Состояния кнопок и действия
  start: "НАЧАТЬ",
  checking: "ПРОВЕРИТЬ",
  claim: "ПОЛУЧИТЬ",
  completed: "ВЫПОЛНЕНО",
  subscribe: "ПОДПИСАТЬСЯ",
  visit: "ПОСЕТИТЬ",
  follow: "ПОДПИСАТЬСЯ",
  repost: "РЕПОСТ",
  share: "ПОДЕЛИТЬСЯ",
  join: "ВСТУПИТЬ",

  // Индикаторы статуса
  waitSeconds: "Ждите {seconds}с",
  waitMinutes: "Ждите {minutes}м",
  verifying: "Проверяем...",
  inProgress: "В процессе",
  readyToClaim: "Готово к получению",

  // ОБНОВЛЕННЫЕ: Награды с разделением типов
  reward: "наград",
  rewards: {
    attempts: "попыток",
    restoreBonus: "к восстановлению",
    attemptsReward: "+{count} попыток",
    restoreBonusReward: "+{count} к восстановлению",
    instantAttempts: "Мгновенные попытки",
    restoreBonusDescription: "Бонус к восстановлению попыток",
  },

  // Разделы и категории
  sections: {
    active: "Активные задания",
    completed: "Выполненные задания",
    all: "Все задания",
    available: "Доступные",
    pending: "В ожидании",
    finished: "Завершенные",
  },

  // Типы заданий с описанием действий
  types: {
    telegram_channel: "Подписка на канал",
    telegram_chat: "Вступление в чат",
    twitter_follow: "Подписка на аккаунт",
    twitter_repost: "Репост твита",
    website_visit: "Посещение сайта",
  },

  // Кнопки действий для разных типов заданий
  actions: {
    telegram_channel: "Подписаться",
    telegram_chat: "Вступить",
    twitter_follow: "Подписаться",
    twitter_repost: "Сделать репост",
    website_visit: "Посетить сайт",
  },

  // Сообщения об ошибках
  errors: {
    notSubscribed: "Вы не подписаны на этот канал или чат",
    taskNotFound: "Задание не найдено или больше недоступно",
    alreadyCompleted: "Это задание уже выполнено",
    alreadyRewarded: "Награда за это задание уже получена",
    cooldownActive: "Задание на перезарядке, подождите",
    verificationFailed: "Проверка не удалась, попробуйте еще раз",
    rewardClaimFailed: "Не удалось получить награду, попробуйте еще раз",
    userNotFound: "Аккаунт пользователя не найден",
    unauthorizedAccess: "У вас нет прав для выполнения этого действия",
    networkError: "Ошибка сети, проверьте подключение",
    serverError: "Ошибка сервера, попробуйте позже",
    invalidTaskState: "Задание находится в неправильном состоянии для этого действия",
    telegramVerificationError: "Ошибка проверки Telegram, убедитесь, что вы подписаны",
    unknownError: "Произошла неожиданная ошибка",
  },

  // ОБНОВЛЕННЫЕ: Сообщения об успехе с разными типами наград
  success: {
    taskStarted: "Задание начато!",
    taskStartedMessage: "Вы успешно начали задание: {title}",
    taskCompleted: "Задание выполнено!",
    taskCompletedMessage: "Отлично! Вы выполнили: {title}",
    rewardClaimed: "Награда получена!",
    attemptsRewardClaimedMessage: "Вы заработали +{count} попыток за {title}!",
    restoreBonusRewardClaimedMessage: "Вы получили +{count} к восстановлению попыток за {title}!",
    subscriptionVerified: "Подписка успешно подтверждена",
    actionCompleted: "Действие успешно выполнено",
  },

  // Описания заданий и инструкции
  descriptions: {
    telegram_channel: "Подпишитесь на Telegram канал и будьте в курсе обновлений",
    telegram_chat: "Присоединитесь к Telegram чату и станьте частью сообщества",
    twitter_follow: "Подпишитесь на аккаунт в Twitter для получения последних новостей",
    twitter_repost: "Сделайте репост твита, чтобы помочь распространить информацию",
    website_visit: "Посетите веб-сайт, чтобы узнать больше",
  },

  // Инструкции для пользователей
  instructions: {
    telegram_channel: "Нажмите Подписаться, чтобы открыть Telegram, затем вернитесь для проверки",
    telegram_chat: "Нажмите Вступить, чтобы открыть Telegram, затем вернитесь для проверки",
    twitter_follow: "Нажмите Подписаться, чтобы открыть Twitter, затем вернитесь для завершения",
    twitter_repost: "Нажмите Репост, чтобы открыть Twitter, затем вернитесь для завершения",
    website_visit: "Нажмите Посетить, чтобы открыть сайт, затем вернитесь для завершения",
    verification_wait: "После выполнения действия нажмите Проверить для подтверждения",
    trust_based: "Выполните действие, затем нажмите для подтверждения",
    auto_verify: "Выполнение будет проверено автоматически",
  },

  // Пустые состояния
  empty: {
    noActiveTasks: "Нет доступных активных заданий",
    noCompletedTasks: "Пока нет выполненных заданий",
    noPendingTasks: "Нет заданий в ожидании",
    startCompleting: "Начните выполнять задания, чтобы заработать награды!",
    allTasksCompleted: "Поздравляем! Вы выполнили все доступные задания",
    checkBackLater: "Заходите позже за новыми заданиями",
  },

  // НОВОЕ: Информация о бонусных попытках
  bonusInfo: {
    modalTitle: "Система бонусных попыток",
    modalSubtitle: "Как работают разные типы наград",
    
    instantAttempts: {
      title: "Мгновенные попытки",
      description: "Добавляются сразу к вашему текущему счетчику попыток",
      sources: "Источники: посещение сайтов, Twitter активности",
      icon: "⚡",
      advantage: "Можно использовать немедленно",
    },
    
    restoreBonus: {
      title: "Бонус к восстановлению",
      description: "Увеличивает количество попыток при их автоматическом восстановлении",
      sources: "Источники: подписка на Telegram каналы и чаты",
      icon: "🔄",
      advantage: "Постоянное преимущество при каждом восстановлении",
      formula: "Восстановление = 10 базовых + ваш бонус",
    },
    
    comparison: {
      title: "Сравнение",
      instant: "Мгновенные: разовое использование",
      restore: "Восстановление: долгосрочное преимущество",
      strategy: "Комбинируйте оба типа для максимальной эффективности",
    },
    
    example: {
      title: "Пример",
      scenario: "У вас +5 к восстановлению:",
      before: "Обычное восстановление: 10 попыток",
      after: "С бонусом: 15 попыток",
      benefit: "На 50% больше попыток при каждом восстановлении!",
    },
    
    close: "Понятно",
  },

  // Информационные и справочные сообщения
  info: {
    telegramVerification: "Подписки Telegram проверяются автоматически",
    trustVerification: "Выполнение задания проверяется на основе подтверждения пользователя",
    completionDelay: "Пожалуйста, подождите {seconds} секунд перед проверкой",
    automaticCheck: "Мы автоматически проверим статус вашей подписки",
    manualConfirmation: "Пожалуйста, подтвердите, что вы выполнили требуемое действие",
    rewardInfo: "Выполняйте задания, чтобы заработать различные типы наград",
    taskProgress: "Отслеживайте свой прогресс во вкладке Выполненные",
    learnMoreBonuses: "Узнать больше о бонусах",
  },

  // Статистика и прогресс
  stats: {
    totalTasks: "Всего заданий",
    completedTasks: "Выполнено",
    pendingTasks: "В ожидании",
    earnedAttempts: "Заработано попыток",
    completionRate: "Процент выполнения",
    progress: "Прогресс: {completed}/{total}",
    attemptsFromTasks: "Попыток из заданий: {count}",
    bonusFromTasks: "Бонус восстановления: +{count}",
  },

  // Время и перезарядка
  timing: {
    justNow: "Только что",
    secondsAgo: "{seconds}с назад",
    minutesAgo: "{minutes}м назад",
    hoursAgo: "{hours}ч назад",
    daysAgo: "{days}д назад",
    cooldownRemaining: "Доступно через {time}",
    verificationTimeout: "Время проверки истекло",
    processingTime: "Это может занять несколько мгновений",
  },

  // Специальные функции
  special: {
    dailyTask: "Ежедневное задание",
    weeklyTask: "Еженедельное задание",
    limitedTime: "Ограниченное время",
    highReward: "Высокая награда",
    easyTask: "Быстрое задание",
    bonusReward: "Доступна бонусная награда",
    telegramReward: "Бонус к восстановлению",
    instantReward: "Мгновенная награда",
  },
} as const;