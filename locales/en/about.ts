// src/locales/en/about.ts - About modal English localization

export const about = {
    title: "ABOUT THE APP",
    subtitle: "Your guide to turning time into disappointment",
    close: "CLOSE AND START SUFFERING",

    sections: {
        gameModes: {
            title: "Game Modes",
            description: "Three unique ways to realize your own digital inadequacy. Each mode is a separate universe of pain.",
        },
        systems: {
            title: "Systems and Mechanics",
            description: "Complex algorithms turning your free time into failure statistics. Scientifically proven disappointment.",
        },
        monetization: {
            title: "Monetization",
            description: "How we turn your despair into our profit. Honest, open, shameless.",
        },
        tips: {
            title: "Tips and Strategies",
            description: "Professional recommendations from those who've already lost all hope but keep playing anyway.",
        },
    },

    gameModes: {
        features: "Mode features",
        reaction: {
            name: "REACTION MODE",
            description: "Reaction speed test for those who think they have fast reflexes. Spoiler: you don't.",
            difficulty: "Zero 🤡",
            duration: "~10 seconds of shame",
            features: {
                0: "One circle appears after 3-5 seconds",
                1: "We measure milliseconds of your fiasco",
                2: "Rating system from 'lightning' to 'turtle'",
                3: "Ability to miss a target the size of your screen",
            },
        },
        survival: {
            name: "SURVIVAL MODE",
            description: "15 levels of escalating chaos. Make one mistake - you lose. Just like in life.",
            difficulty: "Extreme 💀",
            duration: "Until first failure",
            features: {
                0: "15 levels with increasing intensity",
                1: "Multiple white targets + red traps",
                2: "One mistake = instant death",
                3: "Level system from 'warmup' to 'superhuman'",
            },
        },
        physics: {
            name: "PHYSICS MODE",
            description: "Experimental mode with physical laws. F = ma, where F is frustration and a is acceleration of disappointment.",
            difficulty: "Experimental 🧪",
            duration: "~2 minutes of torture",
            features: {
                0: "Circles with physical properties and impulses",
                1: "Limited time + escalating complexity",
                2: "Counting hits, misses, and mistakes",
                3: "Scientific approach to measuring failures",
            },
        },
    },

    systems: {
        attempts: {
            name: "Attempts System",
            description: "Genius scheme for limiting your suffering",
            details: "10 base attempts, reset after 2 hours. Either wait or pay. Pure capitalism.",
        },
        referral: {
            name: "Referral System",
            description: "Turning friendship into game attempts",
            details: "Bring a friend - get +5 attempts. Friend gets +15. The mathematics of friendship.",
        },
        tournaments: {
            name: "Tournament System",
            description: "Competitions for those who need more than personal failures",
            details: "Time-limited tournaments in survival mode. Prizes for top placements.",
        },
        tasks: {
            name: "Tasks System",
            description: "Social tasks for additional attempts",
            details: "Channel subscriptions, reposts, website visits. Working for attempts.",
        },
        shop: {
            name: "In-Game Shop",
            description: "Converting your Telegram Stars into our revenue",
            details: "Purchase attempts for Telegram stars. From 1 attempt to 100-packs.",
        },
        leaderboard: {
            name: "Leaderboard System",
            description: "Public ranking of failures",
            details: "Global and mode-specific leaderboards. See who fails better than you.",
        },
    },

    monetization: {
        telegramStars: {
            title: "Telegram Stars",
            description: "Official currency of disappointment in the Telegram ecosystem",
            features: {
                0: "Secure payments through Telegram",
                1: "Instant attempt delivery after payment",
                2: "Packages from 1 to 100 attempts",
            },
        },
        freeToPlay: {
            title: "Free-to-Play Model",
            description: "Play for free, suffer on schedule. Want more suffering? Pay up.",
        },
    },

    tips: {
        0: {
            title: "Study circle appearance patterns",
            description: "In survival mode, circles appear with certain logic. Study it to... still lose, but consciously.",
        },
        1: {
            title: "Don't rush in reaction mode",
            description: "Better to wait and click accurately than click early and get 'missed'. Though the result is the same - fiasco.",
        },
        2: {
            title: "Develop peripheral vision",
            description: "In survival mode you need to watch the entire screen simultaneously. Like in life - danger everywhere.",
        },
        3: {
            title: "Use attempts wisely",
            description: "You only have 10, and they restore in 2 hours. Plan your defeat in advance.",
        },
        4: {
            title: "Study colors carefully",
            description: "White = good, red = death. Simple as a traffic light, but you'll still confuse them at the critical moment.",
        },
        5: {
            title: "Practice regularly",
            description: "Regular practice improves skills. True, skills don't help much in this game, but you can try.",
        },
    },

    meta: {
        version: "Version 1.0 - Release of Despair",
        disclaimer: "Warning: app is addictive and may seriously harm your self-esteem. Play responsibly.",
    },
} as const;