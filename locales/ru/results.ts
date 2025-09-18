// src/locales/ru/results.ts - Локализация результатов игр
export const results = {
  // Общие элементы результатов
  common: {
    newRecord: "🏆 НОВЫЙ РЕКОРД!",
    finalScore: "Итоговый счёт:",
    bestScore: "Лучший счёт:",
    pointsNeeded: "Нужно очков:",
    hits: "Попаданий:",
    time: "Время:",
    levelsComplete: "Уровней пройдено:",
    
    // Статусы кнопок
    button: {
      starting: "Запуск...",
      saving: "Сохранение...",
      noAttempts: "Нет попыток",
      again: "Ещё раз"
    }
  },

  // Специфичные результаты для режима реакции
  reaction: {
    reactionTime: "Время реакции:",
    bestTime: "Лучшее время:",
    timeNeeded: "Нужно времени:",
    msUnit: "мс",
    
    status: {
      missed: "Промахнулся!",
      hit: "Попал!",
      missedValue: "Промах",
      completeAttempt: "Завершите попытку",
      setTimeFirst: "Сначала установите время"
    }
  },

  // Специфичные результаты для режима выживания
  survival: {
    survivalTime: "Время выживания:",
    correctHits: "Точных попаданий:"
  },

  // Специфичные результаты для режима физики
  physics: {
    survivalTime: "Время выживания:",
    totalHits: "Всего попаданий:"
  },

  // Специфичные результаты для режима вращения
  rotation: {
    rotationTime: "Время вращения:",
    correctHits: "Точных попаданий:"
  }
} as const;