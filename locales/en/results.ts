// src/locales/en/results.ts - Game Results Localization

export const results = {
    // Common Results Elements
    common: {
        newRecord: "🏆 NEW RECORD!",
        finalScore: "Final Score:",
        bestScore: "Best Score:",
        pointsNeeded: "To Break Record:",
        hits: "Hits:",
        time: "Time:",
        levelsComplete: "Levels Completed:",

        // Button Statuses
        button: {
            starting: "Starting...",
            saving: "Saving...",
            noAttempts: "No Attempts",
            again: "Again"
        }
    },

    // Specific Results for Reaction Mode
    reaction: {
        reactionTime: "Reaction Time:",
        bestTime: "Best Time:",
        timeNeeded: "To Break Record:",
        msUnit: "ms",

        status: {
            missed: "Missed!",
            hit: "Hit!",
            missedValue: "Missed",
            completeAttempt: "Complete attempt",
            setTimeFirst: "Record not yet set"
        }
    },

    // Survival mode-specific results
    survival: {
        survivalTime: "Survival time:",
        correctHits: "Hits:"
    },

    // Physics mode-specific results
    physics: {
        survivalTime: "Survival time:",
        totalHits: "Hits:"
    },

    // Rotation mode-specific results
    rotation: {
        rotationTime: "Rotation time:",
        correctHits: "Hits:"
    }
} as const;