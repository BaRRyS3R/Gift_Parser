// src/locales/en/tournaments.ts - Английская локализация турниров

export const tournaments = {
    title: "TOURNAMENTS",
    subtitle: "Compete with players from around the world",

    // Tournament statuses
    status: {
        upcoming: "Upcoming",
        active: "Active",
        ended: "Ended",
        startingSoon: "Starting soon",
    },

    // Game modes
    modes: {
        survival: "Survival",
        physics: "Physics",
        rotation: "Rotation",
    },

    // Filters
    filters: {
        all: "All tournaments",
        active: "Active",
        upcoming: "Upcoming",
        ended: "Ended",
    },

    // List sections
    sections: {
        active: "Active Tournaments",
        upcoming: "Upcoming Tournaments",
        ended: "Ended Tournaments",
    },

    // Empty states
    empty: {
        all: "No tournaments found",
        active: "No active tournaments",
        upcoming: "No upcoming tournaments",
        ended: "No ended tournaments",
        description: "Check back later or change filters",
    },

    // Errors
    error: {
        title: "Loading error",
        notFound: "Tournament not found",
        loadFailed: "Failed to load tournament",
    },

    // Common elements
    prizes: "prizes",
    participants: "participants",
    positions: "prize positions",
    remaining: "remaining",
    duration: "Duration",
    yourPosition: "Your position",
    participating: "Participating",
    playGame: "Play game",
    playNow: "Play now",
    loading: "Loading tournament...",

    // Time formats
    time: {
        justNow: "just now",
        hoursAgo: "{hours}h ago",
        daysAgo: "{days}d ago",
    },

    // Detail view tabs
    tabs: {
        overview: "Overview",
        leaderboard: "Leaderboard",
    },

    // Leaderboard
    leaderboard: {
        empty: "No participants yet",
        beFirst: "Be the first to participate!",
        loading: "Loading leaderboard...",
        loadMore: "Load more",
    },

    // Statistics
    stats: {
        participants: "Participants",
        gamesPlayed: "Games played",
        topScore: "Top score",
        avgScore: "Avg score",
    },

    // Game elements
    gamesPlayed: "games",
    bestScore: "best score",
    outOfParticipants: "out of {total} participants",

    // Tournament rules
    rules: {
        title: "Tournament Rules",
        scoring: "Scoring System",
        bestScore: "The tournament tracks your best score during the event period",

        survival: "Survive as long as possible by hitting white targets and avoiding red traps. The longer you survive, the more points you earn.",
        physics: "Hit active targets in a physics world with gravity. Watch your mistakes - maximum 5 misses allowed.",
        rotation: "Targets rotate in a circle. Hit white targets and avoid red traps. Requires precision and quick reactions.",
    },
} as const;