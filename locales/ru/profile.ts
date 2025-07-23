// src/locales/ru/profile.ts - Updated Russian profile translations with simplified achievements

export const profile = {
  title: "ПРОФИЛЬ",
  loadingProfile: "ЗАГРУЗКА ПРОФИЛЯ...",
  notFound: "ПРОФИЛЬ НЕ НАЙДЕН",
  overallStats: "Общая статистика",
  reactionMode: "Реакция",
  survivalMode: "Выживание",
  physicsMode: "Физика",
  rotationMode: "Вращение",
  noReactionTestsYet: "Нет данных. К счастью.",
  testReflexesToSeeStats:
    "Сыграйте в режим на реакцию, чтобы увидеть статистику",
  noSurvivalAttemptsYet: "Нет данных. К счастью.",
  enterSurvivalToSeeStats:
    "Сыграйте в режим выживания, чтобы увидеть статистику",
  noPhysicsAttemptsYet: "Нет данных. К счастью.",
  enterPhysicsToSeeStats: "Сыграйте в режим с физикой для просмотра статистики",
  noRotationAttemptsYet: "Нет данных. К счастью.",
  enterRotationToSeeStats: "Сыграйте в режим вращения для просмотра статистики",
  totalGames: "Всего игр",
  currentAttempts: "Текущие попытки",
  totalTests: "Всего тестов",
  totalAttempts: "Всего попыток",
  referralButton: "Рефералы",
  achievementButton: "Достижения",
  leagueButton: "Лиги",

  // NEW: Level and league display
  levelDisplay: "Уровень {level}",
  currentLeague: "Текущая",
  gamesUnit: "игр",
  rewardsUnit: "наград",
  gamesRequired: "игр необходимо",
  inLeague: "в",

  // NEW: Level progress
  levelProgress: {
    gamesToNext: "Игр до следующего уровня",
    nextLevel: "Следующий уровень {level}",
    nextLeague: "Следующая лига",
    maxAchieved: "Достигнут максимум",
  },

  // NEW: League position
  leaguePosition: {
    title: "Позиция в лиге",
    yourPosition: "Ваша позиция",
    gamesAhead: "игр впереди",
    gamesBehind: "игр позади",
    aloneInLeague: "Вы один в этой лиге",
    leagueLeader: "Лидер лиги!",
  },

  tabs: {
    stats: "СТАТИСТИКА",
    referrals: "РЕФЕРРАЛЫ",
    history: "ИСТОРИЯ",
    achievements: "ДОСТИЖЕНИЯ",
  },
  levels: {
    rookie: "НОВИЧОК",
    active: "АКТИВНЫЙ",
    skilled: "УМЕЛЫЙ",
    expert: "ЭКСПЕРТ",
    legend: "ЛЕГЕНДА",
  },
  stats: {
    currentAttempts: "Текущие попытки",
    reactionModeStats: "Реакция",
    survivalModeStats: "Выживание",
    physicsModeStats: "Физика",
    rotationModeStats: "Вращение",
    noReactionTests: "НЕТ ТЕСТОВ РЕАКЦИИ",
    testReflexes: "Проверь свои молниеносные рефлексы (если они есть)!",
    noSurvivalAttempts: "НЕТ ПОПЫТОК ВЫЖИВАНИЯ",
    enterSurvival: "ПРИНЯТЬ ВЫЗОВ ВЫЖИВАНИЯ!",
    noPhysicsAttempts: "НЕТ ФИЗИЧЕСКИХ ЭКСПЕРИМЕНТОВ",
    enterPhysics: "ПОПРОБОВАТЬ ФИЗИЧЕСКИЙ ЭКСПЕРИМЕНТ!",
    noRotationAttempts: "НЕТ ВРАЩАЮЩИХСЯ ЭКСПЕРИМЕНТОВ",
    enterRotation: "ПОПРОБОВАТЬ ВРАЩАЮЩИЙСЯ ЭКСПЕРИМЕНТ!",
    bestTime: "Лучшее время",
    bestScore: "Лучший счет",
    averageTime: "Среднее время",
    ranking: "Рейтинг",
    maxLevel: "Максимальный уровень",
    bestStreak: "Лучшая серия",
    bestSurvival: "Лучшее выживание",
    totalExperiments: "Всего экспериментов",
    totalSpins: "Всего вращений",
  },
  referrals: {
    title: "РЕКРУТИНГ",
    friendsInvited: "ПРИГЛАШЕНО ДРУЗЕЙ",
    attemptsBonus: "БОНУСНЫЕ ПОПЫТКИ",
    yourReferralCode: "ВАШ РЕФЕРРАЛЬНЫЙ КОД",
    referralLink: "РЕФЕРРАЛЬНАЯ ССЫЛКА",
    copyLink: "КОПИРОВАТЬ",
    share: "ПОДЕЛИТЬСЯ",
    howItWorks: "КАК ЭТО РАБОТАЕТ",
    shareWithFriends: "Спамь своей реферальной ссылкой.",
    theyGetExtra:
      "Игроки получают дополнительные попытки за регистрацию по вашей ссылке.",
    youGetRecognition:
      "Вы получаете респект за каждого приглашенного. И себе 5 попыток. И всё.",
    helpGrow:
      "Больше народа - меньше кислорода! Но так же больше горящих пердаков.",
    referredBy: "ПРИГЛАШЕН(А)",
  },
  history: {
    title: "ПОСЛЕДНИЕ ИГРЫ",
    noGamesYet: "ЕЩЁ НЕ БЫЛО ИГР",
  },
  achievements: {
    title: "ДОСТИЖЕНИЯ",
    noAchievements: "ДОСТИЖЕНИЙ ЕЩЁ НЕТ",
    playToUnlock: "ИГРАЙТЕ, ЧТОБЫ ОТКРЫВАТЬ ДОСТИЖЕНИЯ!",

    // Updated simplified achievements
    firstGame: "ПЕРВЫЕ ШАГИ",
    allModesPlayer: "УНИВЕРСАЛЬНЫЙ ИГРОК",
    superRecruiter: "СУПЕР ВЕРБОВЩИК",
    lightningReflexes: "МОЛНИЕНОСНЫЕ РЕФЛЕКСЫ",

    descriptions: {
      firstGame: "СЫГРАЛ ПЕРВУЮ ИГРУ",
      allModesPlayer: "ПОПРОБОВАЛ ВСЕ ИГРОВЫЕ РЕЖИМЫ",
      superRecruiter: "ПРИГЛАСИЛ {count}+ ДРУЗЕЙ",
      lightningReflexes: "РЕАКЦИЯ МЕНЕЕ {time} МС",
    },
  },
} as const;