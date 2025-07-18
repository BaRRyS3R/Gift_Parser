// src/locales/en/leagues.ts - English localization for leagues system
export const leagues = {
    title: "LEAGUES",
    level: "Level",
    league: "League",
    progress: "Progress",
    rewards: "Rewards",
    leaderboard: "Leaderboard",

    names: {
        bronze: "Bronze League",
        silver: "Silver League",
        gold: "Gold League",
        platinum: "Platinum League",
        diamond: "Diamond League"
    },

    progressDisplay: {
        currentLevel: "Current Level",
        currentLeague: "Current League",
        gamesPlayed: "Games Played",
        gamesToNext: "Games to Next League",
        maxLevel: "Max Level Reached",
        inTopLeague: "You're in the top league!",
        maxAchieved: "Maximum achieved"
    },

    rewardsSection: {
        title: "League Rewards",
        description: "First 5 players to reach each league get special rewards",
        noRewards: "No rewards yet",
        yourRewards: "Your Rewards",
        rewardReceived: "Reward Received",
        position: "Position #{position}",
        giftReward: "Special Gift",
        attemptsReward: "+{amount} Attempts",
        availableRewards: "Available Rewards",
        available: "Available",
        claimed: "Claimed",
        noRewardsConfigured: "No rewards configured for this league",
        rewardsLeft: "{count} rewards left",
        allClaimed: "All rewards claimed",
        specialReward: "Special Reward"
    },

    leaderboardSection: {
        title: "League Leaderboard",
        topPlayers: "Top Players",
        yourPosition: "Your Position: #{position}",
        notInLeague: "Not in this league",
        gamesNeeded: "Games needed",
        nextReward: "Next reward at {games} games",
        noMoreRewards: "No more rewards available",
        playersInLeague: "{count} players in league",
        gamesToCatch: "{games} games behind leader",
        gamesToNextReward: "{games} games to next reward"
    },

    notifications: {
        levelUp: {
            title: "Level Up!",
            message: "You've reached level {level}!",
            keep_going: "Keep playing!"
        },
        leaguePromotion: {
            title: "League Promotion!",
            message: "Welcome to {league}!",
            position: "You're #{position} to reach this league"
        },
        rewardReceived: {
            title: "Reward Received!",
            giftMessage: "You got: {reward}",
            attemptsMessage: "You got {amount} bonus attempts!",
            position: "Position #{position} in {league}"
        }
    },

    status: {
        loading: "Loading league data...",
        error: "Failed to load league information",
        noData: "No league data available"
    },

    buttons: {
        viewRewards: "View Rewards",
        viewLeaderboard: "View Leaderboard",
        close: "Close",
        showDetails: "Show Details",
        hideDetails: "Hide Details"
    }
} as const;