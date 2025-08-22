// src/locales/ru/quests.ts - Russian localization for quests

export const quests = {
  modal: {
    title: "ДНЕВНОЙ КВЕСТ",
    loading: "ЗАГРУЗКА...",
    error: "ОШИБКА",
    noQuest: "НЕТ КВЕСТА",
    noQuestDescription:
      "Сегодня нет доступных квестов. Заходи завтра за новыми испытаниями!",
    questCompleted: "КВЕСТ ЗАВЕРШЁН!",
    attemptsAwarded: "+{attempts} попыток начислено",
    gameMode: "РЕЖИМ:",
    anyMode: "ЛЮБОЙ РЕЖИМ",
    progress: "ПРОГРЕСС",
    autoProgress: "Прогресс обновляется автоматически после каждой игры",
  },

  // Квесты на игры
  play_games: {
    reaction: {
      title: "Молниеносные рефлексы",
      description: "Сыграй {targetValue} игр в режиме Реакция",
    },
    survival: {
      title: "Испытание выживания",
      description: "Сыграй {targetValue} игр в режиме Выживание",
    },
    physics: {
      title: "Мастер физики",
      description: "Сыграй {targetValue} игр в режиме Физика",
    },
    rotation: {
      title: "Мастер вращения",
      description: "Сыграй {targetValue} игр в режиме Вращение",
    },
    any: {
      title: "Игровой марафон",
      description: "Сыграй {targetValue} игр в любом режиме",
    },
  },

  button: {
    active: "ДНЕВНОЙ КВЕСТ",
    completed: "ЗАВЕРШЁН",
    aria: "Открыть дневной квест",
  },

  // Квесты на очки
  score_points: {
    reaction: {
      title: "Идеальный тайминг",
      description: "Набери {targetValue} очков в режиме Реакция",
    },
    survival: {
      title: "Охотник за очками",
      description: "Набери {targetValue} очков в режиме Выживание",
    },
    physics: {
      title: "Гений физики",
      description: "Набери {targetValue} очков в режиме Физика",
    },
    rotation: {
      title: "Чемпион вращения",
      description: "Набери {targetValue} очков в режиме Вращение",
    },
    any: {
      title: "Коллекционер очков",
      description: "Набери {targetValue} очков в любом режиме",
    },
  },

  // Квесты на попадания
  hit_circles: {
    reaction: {
      title: "Точный удар",
      description: "Попади в {targetValue} кругов в режиме Реакция",
    },
    survival: {
      title: "Охотник за кругами",
      description: "Попади в {targetValue} белых кругов в режиме Выживание",
    },
    physics: {
      title: "Мастер попаданий",
      description: "Попади в {targetValue} кругов в режиме Физика",
    },
    rotation: {
      title: "Вращающийся снайпер",
      description: "Попади в {targetValue} белых кругов в режиме Вращение",
    },
    any: {
      title: "Разрушитель кругов",
      description: "Попади в {targetValue} белых кругов в любом режиме",
    },
  },

  // Прогресс и награды
  progress: {
    current: "{current}/{target}",
    completed: "ЗАВЕРШЕНО",
  },

  reward: "+{attempts} попыток за выполнение",
} as const;
