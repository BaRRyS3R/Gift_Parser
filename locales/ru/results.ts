// src/locales/ru/results.ts - Локализация результатов игр
export const results = {
  // Общие элементы результатов
  common: {
    newRecord: "🏆 НОВЫЙ РЕКОРД!",
    finalScore: "Итоговый счёт:",
    bestScore: "Лучший счёт:",
    pointsNeeded: "До рекорда:",
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
    timeNeeded: "До рекорда:",
    msUnit: "мс",
    
    status: {
      missed: "Промахнулся!",
      hit: "Попал!",
      missedValue: "Промах",
      completeAttempt: "Завершите попытку",
      setTimeFirst: "Рекорд еще не установлен"
    }
  },

  // Специфичные результаты для режима выживания
  survival: {
    survivalTime: "Время выживания:",
    correctHits: "Попаданий:"
  },

  // Специфичные результаты для режима физики
  physics: {
    survivalTime: "Время выживания:",
    totalHits: "Попаданий:"
  },

  // Специфичные результаты для режима вращения
  rotation: {
    rotationTime: "Время вращения:",
    correctHits: "Попаданий:"
  }
} as const;