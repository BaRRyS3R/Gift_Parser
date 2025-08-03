// src/locales/en/levels.ts - English translations for level system

export const levels = {
  display: "lvl {level}",
  profileDisplay: "Level {level}",

  modal: {
    title: "LEVEL SYSTEM",
    currentLevel: "LEVEL",
    totalGames: "{games} games played",
    progress: "LEVEL PROGRESS",
    currentProgress: "Current Progress",
    gamesToNext: "{games} games to next level",
    maxLevelReached: "MAXIMUM LEVEL REACHED",
    maxLevelDescription:
      "You have achieved the highest possible level in the system. Congratulations on your dedication!",

    howItWorks: "HOW LEVELS WORK",
    rule1: "Play any game mode to earn progress toward your next level",
    rule2: "Every 20 games completed increases your level by 1",
    rule3: "Each level increase awards 10 additional attempts",
    rule4: "Maximum achievable level is... Big. Mac.",

    gameModes: "GAME MODE CONTRIBUTIONS",
    reactionMode: "Reaction",
    survivalMode: "Survival",
    physicsMode: "Physics",
    rotationMode: "Rotation",
    counts: "Counts",
    allModesNote: "All game modes contribute equally to level progression.",

    automaticNote:
      "Level increases and attempt rewards are applied automatically.",
    rewardNote: "Attempt bonuses is good ma boy.",
  },
} as const;
