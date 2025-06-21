// src/locales/en.ts - Updated English localization with tournament rules

export const en = {
    // Common UI elements
    common: {
        loading: "LOADING...",
        error: "ERROR",
        retry: "RETRY",
        cancel: "CANCEL",
        confirm: "CONFIRM",
        close: "CLOSE",
        back: "BACK",
        next: "NEXT",
        save: "SAVE",
        delete: "DELETE",
        edit: "EDIT",
        yes: "YES",
        no: "NO",
        ok: "OK",
        continue: "CONTINUE",
        skip: "SKIP",
        start: "START",
        stop: "STOP",
        play: "PLAY",
        pause: "PAUSE",
        quit: "QUIT",
        menu: "MENU",
        settings: "SETTINGS",
        about: "ABOUT",
        help: "HELP",
        info: "INFO",
        share: "SHARE",
        copy: "COPY",
        copied: "COPIED!",
        total: "TOTAL",
        best: "BEST",
        score: "SCORE",
        time: "TIME",
        level: "LEVEL",
        attempts: "ATTEMPTS",
        remaining: "REMAINING",
        used: "USED",
        available: "AVAILABLE",
        unlimited: "UNLIMITED",
        or: "or",
    },

    // Navigation
    nav: {
        home: "Home",
        leaderboard: "Leaderboard",
        profile: "Profile",
        shop: "Shop",
        game: "Game",
        tournament: "Tournament",
        tasks: "Tasks",
    },

    // Tasks
    tasks: {
        // Основные элементы
        title: "TASKS",
        subtitle: "Complete tasks to earn extra attempts",
        loading: "Loading",

        // Кнопки и статусы
        start: "START",
        checking: "CHECKING...",
        claim: "CLAIM",
        completed: "COMPLETED",
        subscribe: "SUBSCRIBE",
        visit: "VISIT",
        follow: "FOLLOW",
        repost: "REPOST",
        share: "SHARE",

        // Статусы ожидания
        waitSeconds: "Wait {seconds}s",
        waitMinutes: "Wait {minutes}m",
        verifying: "Verifying...",

        // Награды
        reward: "Attempts:",

        // Разделы
        sections: {
            story: "Special Task",
            active: "Active Tasks",
            completed: "Completed Tasks"
        },

        // Типы заданий
        types: {
            telegram_channel: "Subscribe",
            telegram_chat: "Join Chat",
            twitter_follow: "Follow",
            twitter_repost: "Repost",
            website_visit: "Visit",
            story_share: "Share Story"
        },

        // Сообщения об ошибках
        errors: {
            notSubscribed: "You are not subscribed to this channel/chat",
            taskNotFound: "Task not found",
            alreadyCompleted: "Task already completed",
            cooldownActive: "Task is on cooldown",
            verificationFailed: "Verification failed, please try again",
            rewardClaimFailed: "Failed to claim reward",
            unknownError: "An unknown error occurred"
        },

        // Сообщения об успехе
        success: {
            taskStarted: "Task started successfully",
            taskCompleted: "Task completed successfully",
            rewardClaimed: "Reward claimed! +{count} attempts added",
            subscriptionVerified: "Subscription verified successfully"
        },

        // Описания заданий
        descriptions: {
            telegram_channel: "Subscribe to channel",
            telegram_chat: "Join chat",
            twitter_follow: "Follow on Twitter",
            twitter_repost: "Repost tweet",
            website_visit: "Visit website",
            story_share: "Share to your Telegram Story"
        },

        // Специальное задание
        storyTask: {
            title: "Share to Story",
            description: "Share the game in your Telegram story every 2 hours",
            cooldownText: "Available again in {time}",
            notSupported: "Story sharing is not supported in this version"
        },

        // Пустые состояния
        empty: {
            noActiveTasks: "No active tasks available",
            noCompletedTasks: "No completed tasks yet",
            startCompleting: "Start completing tasks to earn attempts!"
        },

        // Информационные сообщения
        info: {
            telegramVerification: "Subscription will be verified automatically",
            trustVerification: "Task completion verified on trust basis",
            completionDelay: "Please wait {seconds} seconds for verification"
        }
    },

    // Main page
    main: {
        title: "something",
        greeting: "Hello, {name}",
        startGame: "START GAME",
        loading: "LOADING...",
        welcome: "WELCOME",
        chooseEntryMethod: "Choose entry method",
        initialize: "INITIALIZE",
        quickStart: "QUICK START",
        fullExperience: "Full experience with intro video",
        recommended: "Recommended for new users",
        skipIntro: "Skip intro • Potato mode",
        slowConnections: "For slow internet and impatient 🥔",
    },

    // Auth/Registration
    auth: {
        checkingUser: "Checking user...",
        registering: "Registering...",
        processingReferralBonus: "Processing referral bonus...",
        continueWithoutVideo: "Continue without video",
        referralBonus: "REFERRAL BONUS!",
        youllGet: "You'll get",
        extraAttempt: "extra attempt",
        extraAttempts: "extra attempts",
        referredBy: "Referred by:",
        telegramDataUnavailable: "Telegram WebApp data unavailable",
        databaseConnectionError: "Database connection error",
        userNotFound: "User not found in database, registration required",
        registrationFailed: "User registration failed",
        unknownError: "An unknown error occurred",
    },

    // Game modes
    game: {
        modes: {
            title: "MODE",
            subtitle: "Choose your challenge",
            reaction: {
                name: "REACTION SPEED",
                description: "Test lightning reflexes with precise timing",
                difficulty: "Medium",
                duration: "~10 seconds",
                objective:
                    "Click on the target circle as fast as possible when it appears to measure your reaction time.",
                features: [
                    "Single target precision",
                    "Random timing (3-5s)",
                    "Speed measurement",
                    "Performance rating",
                ],
                rules: [
                    "One circle will appear after a random delay (3-5 seconds)",
                    "Click the circle as fast as possible when it appears",
                    "Only successful clicks are recorded to the leaderboard",
                    "The faster your reaction, the higher your score",
                    "Maximum waiting time: 10 seconds before timeout",
                ],
                tips: [
                    "Stay focused and ready during the waiting period",
                    "Don't anticipate - only react when you see the target",
                    "Use your dominant hand for faster response",
                    "Maintain a comfortable hand position",
                    "Practice regularly to improve reflexes",
                ],
                scoring:
                    "Score calculated based on reaction time: Lightning (≤150ms) = 1.5x bonus, Excellent (≤200ms) = 1.3x bonus, Good (≤300ms) = 1.1x bonus. Base score = 1000 - reaction_time_ms.",
                instructions: {
                    ready: "Get ready for lightning reflex test",
                    waiting: "Wait for the white circle to appear...",
                    clickNow: "CLICK NOW! AS FAST AS POSSIBLE!",
                    targetWillAppear: "Target will appear in 3-5 seconds",
                    lightningFast: "Lightning fast reflexes required",
                    preparing: "Preparing reaction speed test...",
                },
                results: {
                    title: "REACTION",
                    subtitle: "The fiasco has been digitalized. Our... condolences?",
                    reactionTime: "TIMING",
                    missed: "Missed even here.",
                    testAgain: "REPEAT",
                    backToMenu: "BACK TO MENU",
                    noAttemptsLeft: "NO ATTEMPTS",
                },
                ratings: {
                    lightning: "Flash",
                    excellent: "Belissimo",
                    good: "Not bad",
                    average: "So-so",
                    slow: "Blitz, Blitz!",
                    missed: "Missed. Loser.",
                },
                ratingDescriptions: {
                    lightning: "Two options: either you connected your brain via an optical cable, or you just farted from the strain and accidentally poked it.",
                    excellent: "You won. The circle is conquered. The universe gasped at the audacity of your accidental triumph. Enjoy.",
                    good: "Did your hand move? Seriously? I thought it was a cramp. Tip: tie your finger to a fan - it will be more effective.",
                    average: "Your click is the quintessence of disappointment. It's like you're trying to catch Alzheimer's thoughts in a sieve. Try it with your foot?",
                    slow: "Oh my god, this is a living demonstration of the theory of relativity! The click is somewhere in the past!",
                    missed: "Explain it to me: CIRCLE. YOUR FINGER. THE SPACE VOID BETWEEN. You missed a target the size of your future. Hmm.",
                },
            },
            survival: {
                name: "SURVIVAL",
                description:
                    "Survive escalating precision challenges with deadly traps",
                difficulty: "Extreme",
                duration: "Until failure",
                objective:
                    "Survive as long as possible by clicking white circles and avoiding red trap circles through increasingly difficult levels.",
                features: [
                    "15 escalating levels",
                    "Multiple targets",
                    "Trap circles (red)",
                    "One mistake = death",
                ],
                rules: [
                    "Click only white circles - they disappear on correct click",
                    "Never click red circles - they're traps that end the game",
                    "Never click inactive (gray) circles - this also ends the game",
                    "Missing a white circle timeout also ends the game",
                    "Progress through 15 levels with increasing difficulty",
                    "Each level increases speed, targets, and complexity",
                ],
                tips: [
                    "Focus on accuracy over speed - one mistake ends everything",
                    "Track multiple targets simultaneously",
                    "Develop peripheral vision",
                    "Stay calm as intensity increases",
                    "Learn to distinguish colors quickly under pressure",
                ],
                scoring:
                    "Base score = survival_seconds + (perfect_streak × 3) + (level_reached × 15). Higher levels and longer streaks give exponential bonuses.",
                instructions: {
                    oneMistakeDeath: "ONE MISTAKE = DEATH",
                },
                results: {
                    title: "END OF SURVIVAL",
                    survivalTime: "SURVIVAL TIME",
                    finalScore: "FINAL SCORE",
                    attemptsLeft: "ATTEMPTS LEFT",
                    perfectStreak: "PERFECT STREAK",
                    correctHits: "CORRECT HITS",
                    levelProgress: "Level Progress",
                    levelsCompleted: "LEVELS COMPLETED",
                    surviveAgain: "REPEAT",
                    escapeToMenu: "BACK TO MENU",
                    starting: "START...",
                },
                deathCauses: {
                    miss: "The circle has faded. And so has your self-esteem.",
                    wrongClick: "Where are you poking, the circle hasn't activated yet. It's even messed up here.",
                    decoyHit: "2 colors. Red and white. Guess where you poked?!",
                    default: "Survival End",
                },
                levels: {
                    warmingUp: "WARM UP",
                    gettingStarted: "GETTING STARTED",
                    basicPrecision: "BASIC PRECISION",
                    focusRequired: "CONCENTRATION REQUIRED",
                    multiTarget: "MULTI-TARGET",
                    enhancedDifficulty: "INTENSIVE DIFFICULTY",
                    intenseFocus: "INTENSIVE FOCUS",
                    overwhelming: "OVERWHELMING",
                    chaosManagement: "CHAOS MANAGEMENT",
                    expertPrecision: "EXPERT PRECISION",
                    masterLevel: "MASTER LEVEL",
                    legandarySkill: "LEGENDARY MASTERY",
                    superhuman: "SUPERHUMAN",
                    beyondLimits: "BEYOND LIMITS",
                    perfectMachine: "PERFECT MACHINE",
                },
            },
        },
        general: {
            initializingGame: "INITIALIZING GAME...",
            noAttempts: "NO ATTEMPTS",
            noAttemptsLeft: "NO ATTEMPTS",
            attemptsUsed: "All attempts used",
            waitForReset:
                "Wait for automatic reset or buy more attempts",
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
            checkingAttempts: "CHECKING ATTEMPTS...",
        },
    },

    // Tournament system
    tournament: {
        title: "TOURNAMENT",
        noActiveTournament: "No Active Tournament",
        noActiveTournamentDesc: "There are currently no active tournaments. Check back later for upcoming tournaments!",
        tournamentActive: "Tournament Active",
        timeRemaining: "remaining",
        enterTournament: "ENTER TOURNAMENT",
        playTournamentAgain: "PLAY TOURNAMENT AGAIN",
        tournamentEnd: "TOURNAMENT END",
        tournamentMode: "Tournament Mode",
        prizes: "TOURNAMENT PRIZES",
        winners: "PRIZE WINNERS",
        participants: "PARTICIPANTS",
        otherParticipants: "OTHER PARTICIPANTS",
        noParticipants: "No participants yet",
        beFirstParticipant: "Be the first to enter the tournament!",
        yourBestResult: "YOUR BEST RESULT",
        rank: "RANK",
        maxLevel: "MAX LEVEL",
        bestTime: "BEST TIME",
        survivalTime: "SURVIVAL TIME",
        tournamentScore: "TOURNAMENT SCORE",
        perfectStreak: "PERFECT STREAK",
        correctHits: "CORRECT HITS",
        levelsCompleted: "levels completed",
        savingResult: "Saving tournament result...",
        resultSaved: "Tournament result saved successfully",
        resultSavedAfterRetries: "Saved after {attempts} attempts",
        dataSynchronized: "Data synchronized with tournament leaderboard",
        saveFailedRetries: "Save failed after {attempts} attempts",
        resultRecordedLocally: "Your result recorded locally but not synchronized",
        retrySave: "RETRY SAVE",
        connectionIssue: "Connection issue - automatic retry",
        retryingSave: "Retrying save ({attempt}/{max})...",
        loadingTournament: "Loading tournament...",
        tournamentNotFound: "Tournament not found",
        redirectingToTournament: "Redirecting to tournament page...",
        ended: "Ended",
        rulesTitle: "Tournament Rules",
        rulesSubtitle: "Competition Guidelines & Regulations",
        rulesButton: "Tournament Rules & Guidelines",
        rules: {
            gameMode: {
                title: "Game Mode",
                description: "Tournaments use Survival Mode exclusively",
                detail1: "Navigate through 12 increasingly difficult levels",
                detail2: "Survive as long as possible to achieve the highest score",
                detail3: "Each level brings faster targets and more complexity"
            },
            competition: {
                title: "Competition Rules",
                description: "Core tournament competition guidelines",
                detail1: "Each game consumes one attempt from your account balance",
                detail2: "Only your best result counts for the leaderboard ranking",
                detail3: "Click white circles to score points and progress",
                detail4: "Avoid red trap circles at all costs - they end the game",
                detail5: "Missing any target ends the game immediately",
                detail6: "Tournament runs for a limited time period only"
            },
            scoring: {
                title: "Scoring System",
                description: "How tournament rankings are determined",
                detail1: "Survival Time is the primary ranking factor",
                detail2: "Player with the longest survival time wins",
                detail3: "Level Reached serves as a secondary ranking factor",
                detail4: "Perfect Streak shows consecutive successful hits",
                detail5: "In case of tied survival times, highest level reached wins",
                detail6: "Real-time leaderboard updates after each game"
            },
            format: {
                title: "Tournament Format",
                description: "Competition structure and timeline",
                detail1: "Tournament runs for a limited time period",
                detail2: "Real-time leaderboard updates every completed game",
                detail3: "Winners determined at tournament conclusion",
                detail4: "No registration required - just start playing",
                detail5: "Prize distribution based on final rankings",
                detail6: "Multiple attempts allowed during tournament period"
            },
            fairPlay: {
                title: "Fair Play Policy",
                description: "Rules for legitimate competition",
                detail1: "No external tools or automation software allowed",
                detail2: "Account sharing is strictly prohibited",
                detail3: "Suspicious activity may result in disqualification",
                detail4: "All games must be played legitimately by the account owner",
                detail5: "Violations may result in permanent tournament ban"
            },
            tips: {
                title: "Pro Tips",
                description: "Strategies for tournament success",
                detail1: "Practice in regular survival mode before competing",
                detail2: "Focus on accuracy over speed to avoid mistakes",
                detail3: "Stay calm as levels increase in difficulty",
                detail4: "Watch for color changes carefully under pressure",
                detail5: "Develop your peripheral vision for multiple targets",
                detail6: "Manage your attempts strategically during tournament period"
            }
        }
    },

    // Attempts system
    attempts: {
        current: "ATTEMPTS",
        remaining: "ATTEMPTS REMAINING",
        noRemaining: "No attempts left - buy more to continue playing",
        lowRemaining: "Low attempts - consider buying additional ones",
        plenty: "You have plenty of attempts to play",
        resetTime: "Next reset in",
        total: "TOTAL",
    },

    // Profile page
    profile: {
        title: "PROFILE",
        loadingProfile: "LOADING PROFILE...",
        notFound: "PROFILE NOT FOUND",
        overallStats: "Overall Stats",
        reactionMode: "Reaction Mode",
        survivalMode: "Survival Mode",
        noReactionTestsYet: "No reaction tests yet",
        testReflexesToSeeStats: "Take a reflexes test to see stats",
        noSurvivalAttemptsYet: "No survival attempts yet",
        enterSurvivalToSeeStats: "Enter survival mode to see stats",
        totalGames: "Total Games",
        currentAttempts: "Current Attempts",
        totalTests: "Total Tests",
        totalAttempts: "Total Attempts",
        referralButton: "Referrals",
        achievementButton: "Achievements",
        tabs: {
            stats: "STATISTICS",
            referrals: "REFERRALS",
            history: "HISTORY",
            achievements: "ACHIEVEMENTS",
        },
        levels: {
            rookie: "NEWCOMER",
            active: "ACTIVE",
            skilled: "SKILLED",
            expert: "EXPERT",
            legend: "LEGEND",
        },
        stats: {
            currentAttempts: "Current Attempts",
            reactionModeStats: "Reaction",
            survivalModeStats: "Survival",
            noReactionTests: "NO REACTION TESTS",
            testReflexes: "Test your lightning reflexes (if you have them)!",
            noSurvivalAttempts: "NO SURVIVAL ATTEMPTS",
            enterSurvival: "ACCEPT SURVIVAL CHALLENGE!",
            bestTime: "Best Time",
            bestScore: "Best Score",
            averageTime: "Average Time",
            ranking: "Rating",
            maxLevel: "Maximum Level",
            bestStreak: "Best Streak",
        },
        referrals: {
            title: "REFERRAL SYSTEM",
            friendsInvited: "FRIENDS INVITED",
            attemptsBonus: "BONUS ATTEMPTS",
            yourReferralCode: "YOUR REFERRAL CODE",
            referralLink: "REFERRAL LINK",
            copyLink: "COPY LINK",
            share: "SHARE",
            howItWorks: "HOW IT WORKS",
            shareWithFriends: "Share your referral link with your friends",
            theyGetExtra: "They get +{bonus} extra attempt when registering",
            youGetRecognition: "You get respect for each invitee. And 5 attempts for yourself. That's it.",
            helpGrow: "Help develop the community!",
            referredBy: "INVITED",
        },
        history: {
            title: "RECENT GAMES",
            noGamesYet: "NO GAMES PLAYED YET",
        },
        achievements: {
            title: "ACHIEVEMENTS",
            noAchievements: "NO ACHIEVEMENTS UNLOCKED",
            playToUnlock: "PLAY GAMES TO UNLOCK ACHIEVEMENTS!",
            activePlayer: "ACTIVE PLAYER",
            dedicatedGamer: "DEDICATED GAMER",
            gameMaster: "GAME MASTER",
            recruiter: "RECRUITER",
            influencer: "INFLUENCER",
            ambassador: "AMBASSADOR",
            speedTester: "SPEED TESTER",
            quickReflexes: "QUICK REFLEXES",
            lightningFast: "LIGHTNING FAST",
            superhumanSpeed: "SUPERHUMAN SPEED",
            speedDemon: "SPEED DEMON",
            survivor: "SURVIVOR",
            persistentSurvivor: "PERSISTENT SURVIVOR",
            enduranceMaster: "ENDURANCE MASTER",
            survivalLegend: "SURVIVAL LEGEND",
            levelClimber: "LEVEL CLIMBER",
            eliteSurvivor: "ELITE SURVIVOR",
            streakMaster: "STREAK MASTER",
            survivalElite: "SURVIVAL ELITE",
            topPlayer: "TOP PLAYER",
            descriptions: {
                gamesPlayed: "{count}+ GAMES PLAYED",
                invitedFriend: "INVITED {count}+ FRIEND",
                invitedFriends: "INVITED {count}+ FRIENDS",
                testedReaction: "TESTED REACTION SPEED",
                reactionTests: "{count}+ REACTION TESTS",
                subReaction: "SUB {time}MS REACTION",
                topReaction: "TOP 10 REACTION TIME",
                enteredSurvival: "ENTERED SURVIVAL MODE",
                survivalAttempts: "{count}+ SURVIVAL ATTEMPTS",
                secondsSurvival: "{time}+ SECONDS SURVIVAL",
                minuteSurvival: "{time}+ MINUTES SURVIVAL",
                reachedLevel: "REACHED LEVEL {level}+",
                perfectHits: "{count}+ PERFECT HITS",
                topSurvivor: "TOP {rank} SURVIVOR",
                topOverall: "TOP {rank} OVERALL",
            },
        },
    },

    // Leaderboard
    leaderboard: {
        title: "TOP",
        loadingRanking: "LOADING RANKING DATA...",
        failedToLoad: "FAILED TO LOAD RANKING DATA",
        overall: "OVERALL",
        reaction: "REACTION",
        survival: "SURVIVAL",
        players: "PLAYERS",
        fastest: "FASTEST",
        longest: "LONGEST",
        top: "TOP",
        you: "YOU",
        noSpeedDemons: "NO SPEED DEMONS YET",
        noSurvivors: "NO SURVIVORS YET",
        noPlayers: "NO PLAYERS YET",
        testReflexes: "TEST YOUR REFLEXES!",
        enterChallenge: "ENTER THE SURVIVAL CHALLENGE!",
        beFirst: "BE THE FIRST TO PLAY!",
        speedElite: "SPEED ELITE",
        survivalElite: "SURVIVAL ELITE",
        topPlayers: "TOP PLAYERS",
        allPlayers: "ALL PLAYERS",
    },

    // Shop
    shop: {
        title: "SHOP",
        subtitle: "Purchase additional game attempts",
        moreAttempts: "More Attempts",
        description: "Get 1 additional game attempt",
        features: "Features",
        benefits: [
            "Play one more game",
            "Instant activation",
            "No expiration date",
        ],
        price: "{price} Telegram Stars",
        purchase: "BUY FOR {price} ⭐",
        creatingInvoice: "CREATING INVOICE...",
        processingPayment: "PROCESSING PAYMENT...",
        purchaseSuccessful: "Purchase Successful!",
        purchaseFailed: "Purchase Failed",
        attemptAdded: "+1 attempt added to your account",
        paymentInfo: "Payment Information",
        purchaseSuccess: "Purchase Successful!",
        purchaseSuccessMessage: "{attempts} attempt{plural} added to your account",
        instantResetSuccess: "Attempts Restored!",
        instantResetMessage: "Your attempts have been restored and timer reset",
        support: "Support",
        supportContact: "For refund inquiries contact:",
        supportLink: "https://t.me/mrmrcrowley",
        paymentDetails: [
            "• Payments processed through Telegram Stars",
            "• Attempts added instantly after payment",
            "• Secure payment through Telegram",
            "• No limit on number of attempts",
            "• No recurring charges",
        ],
        products: {
            attempts1: {
                title: "+1 Attempt",
                description: "Get 1 additional game attempt",
            },
            attempts5: {
                title: "+5 Attempts",
                description: "Get 5 additional game attempts",
            },
            attempts10: {
                title: "+10 Attempts",
                description: "Get 10 additional game attempts",
            },
            attempts100: {
                title: "+100 Attempts",
                description: "Get 100 additional game attempts",
            },
            instantReset: {
                title: "Instant Reset",
                description: "Instantly restore 10 attempts and reset cooldown",
            }
        },
        attemptNotRecorded: "⚠ Attempt not recorded",
        onlySuccessful:
            "Only successful reaction times are saved to leaderboard",
        saveFailed: "✗ Save failed after {attempts} attempts",
        recordedLocally: "Your time recorded locally but not synchronized",
        retrySave: "RETRY SAVE",
        badges: {
            test: "Test",
            popular: "Popular",
            bestvalue: "Best Value",
            ultimate: "Ultimate",
            instant: "Instant"
        },
        testProduct: {
            title: "Test Product",
            description: "Visual effects demonstration",
            button: "Test Effects"
        },
        buy: "Buy",
        loading: "Loading...",
        notifications: {
            purchaseSuccess: "Purchase Successful!",
            purchaseSuccessMessage: "{attempts} attempt{plural} added to your account",
            instantResetSuccess: "Attempts Restored!",
            instantResetMessage: "Your attempts have been restored and timer reset",
        },
    },

    // Save status messages
    save: {
        recording: "Recording survival data...",
        recordingReaction: "Recording reaction time...",
        retrying: "Retrying save ({attempt}/{max})...",
        connectionIssue: "Connection issue - automatic retry",
        savedSuccessfully: "✓ Result saved successfully",
        savedAfterRetries: "Saved after {attempts} attempts",
        synchronized: "Data synchronized with leaderboard",
        recordedSuccessfully: "✓ Survival record saved successfully",
    },

    // Error messages
    errors: {
        telegramUnavailable: "Telegram WebApp API unavailable",
        userNotFound: "User not found",
        noAttempts: "No attempts remaining",
        saveGameResult: "Failed to save game result",
        connectionError: "Connection error",
        unknownError: "An unknown error occurred",
        paymentCancelled:
            "Payment was cancelled or failed. Please try again.",
        createInvoice: "Failed to create payment invoice",
        consumeAttempt: "Error consuming attempt",
    },

    // Time formatting
    time: {
        seconds: "{time}s",
        minutes: "{minutes}:{seconds}",
        milliseconds: "{time}ms",
    },
} as const;