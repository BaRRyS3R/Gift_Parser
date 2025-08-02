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
        maxLevelDescription: "You have achieved the highest possible level in the system. Congratulations on your dedication!",

        howItWorks: "HOW LEVELS WORK",
        rule1: "Play any game mode to earn progress toward your next level",
        rule2: "Every {games} games completed increases your level by 1",
        rule3: "Each level increase awards {attempts} additional attempts",
        rule4: "Maximum achievable level is {maxLevel}",

        gameModes: "GAME MODE CONTRIBUTIONS",
        reactionMode: "Reaction",
        survivalMode: "Survival",
        physicsMode: "Physics",
        rotationMode: "Rotation",
        counts: "Counts",
        allModesNote: "All game modes contribute equally to level progression.",

        automaticNote: "Level increases and attempt rewards are applied automatically after each game.",
        rewardNote: "Attempt bonuses from level increases are permanent additions to your account balance.",
    },
} as const;