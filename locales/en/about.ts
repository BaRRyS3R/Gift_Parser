// src/locales/en/about.ts - About modal English localization

export const about = {
    title: "ABOUT THE APP",
    subtitle: "Your guide to understanding the application features",
    close: "CLOSE",

    sections: {
        gameModes: {
            title: "Game Modes",
            description: "Three distinct game modes designed to test different aspects of player reaction and skill.",
        },
        systems: {
            title: "Systems and Mechanics",
            description: "Core application systems that manage user progression, engagement, and monetization.",
        },
        monetization: {
            title: "Monetization",
            description: "Revenue model based on optional premium features and time-saving purchases.",
        },
        tips: {
            title: "Tips and Strategies",
            description: "Professional recommendations to improve performance and maximize success rates.",
        },
    },

    gameModes: {
        features: "Mode features",
        reaction: {
            name: "REACTION MODE",
            description: "Test your reaction speed with precise timing challenges.",
            difficulty: "Beginner",
            duration: "~10 seconds",
            features: {
                first: "Single target appears after 3-5 second delay",
                second: "Millisecond-precise reaction time measurement",
                third: "Performance rating system with detailed feedback",
                fourth: "Progressive difficulty adjustment based on performance",
            },
        },
        survival: {
            name: "SURVIVAL MODE",
            description: "Navigate through 15 increasingly challenging levels with zero error tolerance.",
            difficulty: "Advanced",
            duration: "Variable based on performance",
            features: {
                first: "15 progressive difficulty levels",
                second: "Multiple simultaneous targets with decoy elements",
                third: "Single mistake elimination mechanic",
                fourth: "Advanced level progression system",
            },
        },
        physics: {
            name: "PHYSICS MODE",
            description: "Experimental mode incorporating realistic physics mechanics and object interactions.",
            difficulty: "Expert",
            duration: "~2 minutes",
            features: {
                first: "Physics-based circle movement and collisions",
                second: "Time-limited gameplay with escalating complexity",
                third: "Comprehensive performance tracking and analytics",
                fourth: "Advanced scoring system with multiple metrics",
            },
        },
    },

    systems: {
        attempts: {
            name: "Attempts System",
            description: "Fair-play mechanism that manages gaming frequency",
            details: "10 base attempts with automatic 2-hour reset cycle. Additional attempts available through purchase or referral program.",
        },
        referral: {
            name: "Referral Program",
            description: "Community growth incentive system",
            details: "Invite friends to earn +5 attempts. New users receive +15 attempts when joining through referral links.",
        },
        tournaments: {
            name: "Tournament System",
            description: "Competitive events with ranking and prizes",
            details: "Time-limited competitive events in survival mode featuring leaderboards and prize distribution.",
        },
        tasks: {
            name: "Social Tasks",
            description: "Community engagement missions for additional attempts",
            details: "Complete social media interactions, channel subscriptions, and website visits to earn extra gameplay attempts.",
        },
        shop: {
            name: "In-App Shop",
            description: "Premium features and time-saving options",
            details: "Purchase additional attempts using Telegram Stars. Various packages available from individual attempts to bulk purchases.",
        },
        leaderboard: {
            name: "Leaderboard System",
            description: "Global and mode-specific rankings",
            details: "Comprehensive ranking system across all game modes with real-time updates and performance analytics.",
        },
    },

    monetization: {
        telegramStars: {
            title: "Telegram Stars",
            description: "Secure payment system integrated with Telegram ecosystem",
            features: {
                first: "Secure transactions through Telegram platform",
                second: "Instant delivery of purchased attempts",
                third: "Flexible package options from 1 to 100 attempts",
            },
        },
        freeToPlay: {
            title: "Free-to-Play Model",
            description: "Core game features available at no cost with optional premium enhancements.",
        },
    },

    tips: {
        first: {
            title: "Study target appearance patterns",
            description: "In survival mode, targets follow specific timing patterns. Understanding these patterns significantly improves performance and progression.",
        },
        second: {
            title: "Optimize reaction timing",
            description: "In reaction mode, wait for target activation rather than anticipating. Premature clicks result in missed attempts and reduced scores.",
        },
        third: {
            title: "Develop peripheral vision awareness",
            description: "Survival mode requires simultaneous monitoring of multiple screen areas. Practice scanning techniques to track multiple targets effectively.",
        },
        fourth: {
            title: "Manage attempts strategically",
            description: "With only 10 attempts per 2-hour cycle, plan gaming sessions carefully. Consider practice sessions during high-energy periods.",
        },
        fifth: {
            title: "Master color recognition",
            description: "White targets are valid, red targets are elimination traps. Develop quick color discrimination skills for consistent performance.",
        },
        sixth: {
            title: "Maintain consistent practice schedule",
            description: "Regular practice sessions improve muscle memory and reaction times. Consistent engagement leads to measurable skill improvement.",
        },
    },

    meta: {
        version: "Version 1.0 - Initial Release",
        disclaimer: "Application designed for entertainment purposes. Practice responsible gaming habits and take regular breaks.",
    },
} as const;