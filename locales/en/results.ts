// src/locales/en/results.ts - Game results localization (English)
export const results = {
  // Common result elements
  common: {
    newRecord: "🏆 NEW RECORD!",
    finalScore: "Final score:",
    bestScore: "Best score:",
    pointsNeeded: "Points needed:",
    hits: "Hits:",
    time: "Time:",
    levelsComplete: "Levels complete:",
    
    // Button states
    button: {
      starting: "Starting...",
      saving: "Saving...",
      noAttempts: "No attempts",
      again: "Again"
    }
  },

  // Specific results for reaction mode
  reaction: {
    reactionTime: "Reaction time:",
    bestTime: "Best time:",
    timeNeeded: "Time needed:",
    msUnit: "ms",
    
    status: {
      missed: "Missed target!",
      hit: "Target hit!",
      missedValue: "Missed",
      completeAttempt: "Complete attempt",
      setTimeFirst: "Set a time first"
    }
  },

  // Specific results for survival mode
  survival: {
    survivalTime: "Survival time:",
    correctHits: "Correct hits:"
  },

  // Specific results for physics mode
  physics: {
    survivalTime: "Survival time:",
    totalHits: "Total hits:"
  },

  // Specific results for rotation mode
  rotation: {
    rotationTime: "Rotation time:",
    correctHits: "Correct hits:"
  }
} as const;