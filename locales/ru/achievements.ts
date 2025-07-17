// src/locales/ru/achievements.ts - Russian achievements localization

export const achievements = {
  title: "ДОСТИЖЕНИЯ",
  subtitle: "Отслеживайте прогресс и открывайте награды",
  loading: "Загрузка",
  error: {
    title: "Ошибка",
    description: "Чот случилось(((",
  },
  stats: {
    unlocked: "Получено",
    locked: "Не получено",
    all: "Все",
    total: "Всего",
    progress: "Прогресс",
  },

  categories: {
    gameplay: "Геймплей",
    progression: "Прогрессия",
    mastery: "Мастерство",
    social: "Социальные",
    league: "Продвижение по лигам",
    special: "Элитный статус",
  },

  rarity: {
    common: "Обычное",
    rare: "Редкое",
    epic: "Эпичное",
    legendary: "Легендарное",
  },

  gameplay: {
    firstSteps: {
      title: "Первые шаги",
      description: "Завершите первую игровую сессию",
    },
    gettingStarted: {
      title: "Начало пути",
      description: "Завершите 10 игровых сессий",
    },
    regularPlayer: {
      title: "Обычный игрок",
      description: "Завершите 25 игровых сессий",
    },
    dedicatedPlayer: {
      title: "Преданный игрок",
      description: "Завершите 50 игровых сессий",
    },
    experiencedGamer: {
      title: "Опытный геймер",
      description: "Завершите 100 игровых сессий",
    },
    seriousCompetitor: {
      title: "Серьёзный соперник",
      description: "Завершите 250 игровых сессий",
    },
    elitePlayer: {
      title: "Элитный игрок",
      description: "Завершите 500 игровых сессий",
    },
    legendaryGamer: {
      title: "Легендарный геймер",
      description: "Завершите 1000 игровых сессий",
    },
    modeExplorer: {
      title: "Исследователь режимов",
      description: "Попробуйте все доступные игровые режимы",
    },
  },

  progression: {
    levelClimber: {
      title: "Покоритель уровней",
      description: "Достигните 5 уровня",
    },
    advancedPlayer: {
      title: "Продвинутый игрок",
      description: "Достигните 25 уровня",
    },
    eliteLevel: {
      title: "Элитный уровень",
      description: "Достигните 50 уровня",
    },
    veteran: {
      title: "Ветеран",
      description: "Достигните 75 уровня",
    },
    maxLevel: {
      title: "Финальное достижение",
      description: "Достигните максимального 100 уровня",
    },
  },

  mastery: {
    survivalMaster: {
      title: "Мастер выживания",
      description: "Выживите 2+ минуты и достигните 10 уровня",
    },
    reactionDemon: {
      title: "Демон реакции",
      description: "Достигните времени реакции менее 100мс",
    },
    physicsGenius: {
      title: "Гений физики",
      description: "Наберите 10000+ очков в режиме физики",
    },
    rotationLegend: {
      title: "Легенда вращения",
      description: "Выживите 3+ минуты в режиме вращения",
    },
    perfectionist: {
      title: "Перфекционист",
      description: "Достигните 100 идеальных попаданий подряд",
    },
  },

  social: {
    recruiter: {
      title: "Вербовщик",
      description: "Пригласите первого друга",
    },
    networker: {
      title: "Сетевик",
      description: "Пригласите 10 друзей",
    },
    influencer: {
      title: "Влиятельная личность",
      description: "Пригласите 100 друзей",
    },
    communityBuilder: {
      title: "Строитель сообщества",
      description: "Пригласите 500 друзей",
    },
    communityLeader: {
      title: "Лидер сообщества",
      description: "Пригласите 1000 друзей",
    },
  },

  league: {
    silverTier: {
      title: "Серебряный уровень",
      description: "Достигните Серебряной лиги",
    },
    goldTier: {
      title: "Золотой уровень",
      description: "Достигните Золотой лиги",
    },
    platinumTier: {
      title: "Платиновый уровень",
      description: "Достигните Платиновой лиги",
    },
    diamondElite: {
      title: "Алмазная элита",
      description: "Достигните Алмазной лиги",
    },
  },

  special: {
    eliteSurvivor: {
      title: "Элитный выживший",
      description: "Выживите 5+ минут в режиме выживания",
    },
    lightningReflexes: {
      title: "Молниеносные рефлексы",
      description: "Достигните времени реакции менее 10мс",
    },
    physicsMaster: {
      title: "Мастер физики",
      description: "Наберите 1000+ очков в режиме физики",
    },
  },

  empty: {
    title: "Пока нет достижений",
    description: "Играйте в игры, чтобы открыть достижения",
  },
} as const;
