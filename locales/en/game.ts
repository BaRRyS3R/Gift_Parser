// src/locales/en/game.ts - Game modes and gameplay
export const game = {
    modes: {
        title: "MODE",
        subtitle: "Choose your challenge",
        reaction: {
            name: "REACTION",
            description: "Hopefully you'll hit at least here.",
            difficulty: "Zero",
            duration: "~10 seconds",
            objective:
                "Faster click = cooler reaction. Obviously, silly))",
            features: [
                "One circle (not Mikhail)",
                "Random timing (3-5s)",
                "Speed measurement",
                "Performance rating"
            ],
            instructions: {
                ready: "Get ready",
                waiting: "Waiting...",
                clickNow: "Go go!",
                targetWillAppear: "Target appears in 3-5 seconds",
                lightningFast: "Lightning-fast reflexes n-needed?",
                preparing: "Preparing"
            },
            results: {
                title: "REACTION",
                subtitle: "Failure digitized. Please accept our... condolences?",
                reactionTime: "TIMING",
                missed: "Missed. Loser",
                testAgain: "TRY AGAIN",
                backToMenu: "BACK TO MENU",
                noAttemptsLeft: "NO ATTEMPTS LEFT"
            },
            ratings: {
                lightning: "Lightning Fast",
                excellent: "Bellissimo",
                good: "Decent",
                average: "Meh",
                slow: "Blitz! Blitz!",
                missed: "Missed even here."
            },
            ratingDescriptions: {
                lightning: "Two options: either you connected your brain via fiber optics, or you farted from tension and accidentally clicked.",
                excellent: "You won. The circle is conquered. The universe gasped at your audacity. Enjoy.",
                good: "Was that your hand moving? Seriously? I thought it was a spasm. Pro tip: tie your finger to a fan - more efficient.",
                average: "Your click is the quintessence of disappointment. Like trying to catch an Alzheimer's thought in a sieve. Try using your foot?",
                slow: "God, this is a live demo of relativity theory! Your click is somewhere in the past!",
                missed: "Explain this to me: CIRCLE. YOUR FINGER. COSMIC VOID BETWEEN THEM. You missed a target the size of your future. Smh."
            }
        },
        survival: {
            name: "SURVIVAL",
            description: "Survive. As long as you can.",
            difficulty: "Extreme",
            duration: "Until failure",
            objective:
                "Click on the white ones. Click click click, faster, even faster! Oops, you lost.",
            features: [
                "15 escalating levels",
                "Multiple targets",
                "Trap circles (red)",
                "Make a mistake - you lose. As always."
            ],
            instructions: {
                oneMistakeDeath: "ONE MISTAKE = DEATH"
            },
            results: {
                title: "SURVIVAL ENDED",
                survivalTime: "SURVIVAL TIME",
                finalScore: "FINAL SCORE",
                attemptsLeft: "ATTEMPTS LEFT",
                perfectStreak: "PERFECT STREAK",
                correctHits: "ACCURATE HITS",
                levelProgress: "Level progress",
                levelsCompleted: "LEVELS COMPLETED",
                surviveAgain: "RETRY",
                escapeToMenu: "BACK TO MENU",
                starting: "STARTING..."
            },
            deathCauses: {
                miss: "Circle faded. And you.. )) No negativity.",
                wrongClick: "Where are you clicking? Circle isn't active yet. Failed even here.",
                decoyHit: "Two colors. Red and white. Guess where you clicked?!",
                default: "Survival ended"
            },
            levels: {
                warmingUp: "WARM-UP",
                gettingStarted: "GETTING STARTED",
                basicPrecision: "BASIC PRECISION",
                focusRequired: "FOCUS REQUIRED",
                multiTarget: "MULTI-TARGET",
                enhancedDifficulty: "ENHANCED DIFFICULTY",
                intenseFocus: "INTENSE FOCUS",
                overwhelming: "OVERWHELMING",
                chaosManagement: "CHAOS MANAGEMENT",
                expertPrecision: "EXPERT PRECISION",
                masterLevel: "MASTER LEVEL",
                legandarySkill: "LEGENDARY SKILL",
                superhuman: "SUPERHUMAN",
                beyondLimits: "BEYOND LIMITS",
                perfectMachine: "PERFECT MACHINE"
            }
        },
        physics: {
            name: "PHYSICS",
            description: "Physics is cool.",
            difficulty: "Experimental",
            duration: "~2 minutes",
            objective:
                "Click on white circles, don't miss. Don't click red ones either. Honestly, you can just sit there doing nothing - you'll lose anyway.",
            features: [
                "Physics is cool.",
                "Impulses are cool.",
                "Mistakes are lessons. Too bad not for you.",
                "Such is life."
            ],
            results: {
                title: "F = ma",
                gameTime: "GAME TIME",
                finalScore: "FINAL SCORE",
                totalHits: "TOTAL HITS",
                mistakesMade: "MISTAKES",
                survivalTime: "SURVIVAL TIME",
                playAgain: "PLAY AGAIN",
                backToMenu: "BACK TO MENU"
            },
            deathCauses: {
                mistakes: "So many mistakes... Just like your life.",
                escapedCircles: "Circles escaped the container. Getting away from you.",
                timeout: "Time's up. No idea how, since it's infinite.",
                default: "Totally owned physics. Well done."
            }
        }
    },
    general: {
        initializingGame: "INITIALIZING GAME...",
        noAttempts: "NO ATTEMPTS",
        noAttemptsLeft: "NO ATTEMPTS LEFT",
        attemptsUsed: "All attempts used",
        waitForReset:
            "Wait for auto-reset or buy more attempts",
        resetIn: "Reset in:",
        automaticReset: "Attempts reset automatically every 2 hours",
        useWisely: "Use attempts wisely - every game counts!",
        objective: "OBJECTIVE",
        rules: "RULES",
        proTips: "PRO TIPS",
        scoringSystem: "SCORING SYSTEM",
        difficulty: "Difficulty",
        duration: "Duration",
        startPlaying: "START PLAYING",
        checkingAttempts: "CHECKING ATTEMPTS..."
    }
} as const;