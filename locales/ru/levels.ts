// src/locales/ru/levels.ts - Russian translations for level system

export const levels = {
  display: "ур. {level}",
  profileDisplay: "Уровень {level}",

  modal: {
    title: "СИСТЕМА УРОВНЕЙ",
    currentLevel: "УРОВЕНЬ",
    totalGames: "сыграно игр: {games}",
    progress: "ПРОГРЕСС УРОВНЯ",
    currentProgress: "Текущий прогресс",
    gamesToNext: "{games} игр до следующего уровня",
    maxLevelReached: "ДОСТИГНУТ МАКСИМАЛЬНЫЙ УРОВЕНЬ",
    maxLevelDescription:
      "Вы достигли наивысшего возможного уровня в системе. Поздравляем с вашей преданностью!",

    howItWorks: "КАК РАБОТАЮТ УРОВНИ",
    rule1:
      "Играйте в любой игровой режим для получения прогресса к следующему уровню",
    rule2: "Каждые {games} завершенных игр повышают ваш уровень на 1",
    rule3:
      "Каждое повышение уровня награждает {attempts} дополнительными попытками",
    rule4: "Максимально достижимый уровень: {maxLevel}",

    gameModes: "ВКЛАД ИГРОВЫХ РЕЖИМОВ",
    reactionMode: "Реакция",
    survivalMode: "Выживание",
    physicsMode: "Физика",
    rotationMode: "Вращение",
    counts: "Засчитывается",
    allModesNote: "Все игровые режимы одинаково влияют на прогресс уровня.",

    automaticNote:
      "Повышения уровня и награды попытками применяются автоматически после каждой игры.",
    rewardNote:
      "Бонусные попытки от повышения уровня являются постоянными добавлениями к балансу вашего аккаунта.",
  },
} as const;
