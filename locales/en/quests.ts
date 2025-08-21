// src/locales/en/quests.ts - English localization for quests

export const quests = {
  modal: {
    title: "DAILY QUEST",
    loading: "LOADING...",
    error: "ERROR",
    noQuest: "NO QUEST TODAY",
    noQuestDescription: "No daily quest is available today. Check back tomorrow for new challenges!",
    questCompleted: "QUEST COMPLETED!",
    attemptsAwarded: "+{attempts} attempts awarded",
    gameMode: "MODE:",
    anyMode: "ANY MODE",
    progress: "PROGRESS",
    autoProgress: "Progress updates automatically after each game",
  },

  button: {
    active: "DAILY QUEST",
    completed: "COMPLETED",
    aria: "Open daily quest",
  },

  // Play games quests
  play_games: {
    reaction: {
      title: "Lightning Reflexes",
      description: "Play {targetValue} Reaction games",
    },
    survival: {
      title: "Survivor's Challenge", 
      description: "Play {targetValue} Survival games",
    },
    physics: {
      title: "Physics Mastery",
      description: "Play {targetValue} Physics games", 
    },
    rotation: {
      title: "Spin Master",
      description: "Play {targetValue} Rotation games",
    },
    any: {
      title: "Gaming Marathon",
      description: "Play {targetValue} games in any mode",
    },
  },

  // Score points quests
  score_points: {
    reaction: {
      title: "Perfect Timing",
      description: "Score {targetValue} points in Reaction mode",
    },
    survival: {
      title: "Point Hunter",
      description: "Score {targetValue} points in Survival mode",
    },
    physics: {
      title: "Physics Genius", 
      description: "Score {targetValue} points in Physics mode",
    },
    rotation: {
      title: "Rotation Champion",
      description: "Score {targetValue} points in Rotation mode",
    },
    any: {
      title: "Score Collector",
      description: "Score {targetValue} points in any mode",
    },
  },

  // Hit circles quests
  hit_circles: {
    reaction: {
      title: "Precision Strike",
      description: "Hit {targetValue} circles in Reaction mode",
    },
    survival: {
      title: "Circle Hunter",
      description: "Hit {targetValue} white circles in Survival mode",
    },
    physics: {
      title: "Impact Master",
      description: "Hit {targetValue} circles in Physics mode",
    },
    rotation: {
      title: "Spinning Sniper",
      description: "Hit {targetValue} white circles in Rotation mode",
    },
    any: {
      title: "Circle Destroyer",
      description: "Hit {targetValue} white circles in any mode",
    },
  },

  // Progress and rewards
  progress: {
    current: "{current}/{target}",
    completed: "COMPLETED",
  },
  
  reward: "+{attempts} attempts on completion",
} as const;