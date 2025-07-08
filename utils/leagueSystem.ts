// src/utils/leagueSystem.ts - League and Level System utilities

import type { League, User, PlayerReward } from "@/lib/supabase";

// Constants for level calculation
export const LEVEL_CONSTANTS = {
    GAMES_PER_LEVEL: 100,
    MAX_LEVEL: 100,
    MIN_LEVEL: 1,
    REWARD_INTERVAL: 20, // Every 20 levels
} as const;

// Constants for league calculation
export const LEAGUE_REQUIREMENTS = {
    Bronze: 0,    // Default league
    Silver: 50,   // 50+ total games across qualifying modes
    Gold: 200,    // 200+ total games across qualifying modes  
    Diamond: 500, // 500+ total games across qualifying modes
} as const;

/**
 * Calculate player level based on qualifying games
 * Qualifying games: survival + physics + rotation (NOT reaction)
 */
export function calculatePlayerLevel(user: User): number {
    const qualifyingGames = user.survival_games + user.physics_games + user.rotation_games;
    const calculatedLevel = Math.floor(qualifyingGames / LEVEL_CONSTANTS.GAMES_PER_LEVEL) + 1;

    return Math.min(Math.max(calculatedLevel, LEVEL_CONSTANTS.MIN_LEVEL), LEVEL_CONSTANTS.MAX_LEVEL);
}

/**
 * Calculate current league based on total qualifying games
 */
export function calculateLeague(user: User): League {
    const qualifyingGames = user.survival_games + user.physics_games + user.rotation_games;

    if (qualifyingGames >= LEAGUE_REQUIREMENTS.Diamond) return "Diamond";
    if (qualifyingGames >= LEAGUE_REQUIREMENTS.Gold) return "Gold";
    if (qualifyingGames >= LEAGUE_REQUIREMENTS.Silver) return "Silver";
    return "Bronze";
}

/**
 * Get progress to next level (0-1)
 */
export function getLevelProgress(user: User): number {
    const qualifyingGames = user.survival_games + user.physics_games + user.rotation_games;
    const currentLevelGames = qualifyingGames % LEVEL_CONSTANTS.GAMES_PER_LEVEL;
    return currentLevelGames / LEVEL_CONSTANTS.GAMES_PER_LEVEL;
}

/**
 * Get games remaining to next level
 */
export function getGamesToNextLevel(user: User): number {
    const qualifyingGames = user.survival_games + user.physics_games + user.rotation_games;
    const currentLevelGames = qualifyingGames % LEVEL_CONSTANTS.GAMES_PER_LEVEL;
    return LEVEL_CONSTANTS.GAMES_PER_LEVEL - currentLevelGames;
}

/**
 * Get progress to next league (0-1)
 */
export function getLeagueProgress(user: User): { progress: number; nextLeague: League | null; gamesNeeded: number } {
    const qualifyingGames = user.survival_games + user.physics_games + user.rotation_games;
    const currentLeague = calculateLeague(user);

    let nextLeague: League | null = null;
    let nextRequirement = 0;

    switch (currentLeague) {
        case "Bronze":
            nextLeague = "Silver";
            nextRequirement = LEAGUE_REQUIREMENTS.Silver;
            break;
        case "Silver":
            nextLeague = "Gold";
            nextRequirement = LEAGUE_REQUIREMENTS.Gold;
            break;
        case "Gold":
            nextLeague = "Diamond";
            nextRequirement = LEAGUE_REQUIREMENTS.Diamond;
            break;
        case "Diamond":
            return { progress: 1, nextLeague: null, gamesNeeded: 0 };
    }

    const currentRequirement = LEAGUE_REQUIREMENTS[currentLeague];
    const progress = Math.min(1, (qualifyingGames - currentRequirement) / (nextRequirement - currentRequirement));
    const gamesNeeded = Math.max(0, nextRequirement - qualifyingGames);

    return { progress, nextLeague, gamesNeeded };
}

/**
 * Get available rewards for player level
 */
export function getAvailableRewards(playerLevel: number): PlayerReward[] {
    const rewards: PlayerReward[] = [];

    for (let level = LEVEL_CONSTANTS.REWARD_INTERVAL; level <= playerLevel; level += LEVEL_CONSTANTS.REWARD_INTERVAL) {
        const rewardNumber = level / LEVEL_CONSTANTS.REWARD_INTERVAL;
        rewards.push({
            id: `test_gift_${rewardNumber}`,
            level: level,
            name: `Test Gift ${rewardNumber}`,
            description: `Reward for reaching level ${level}`,
        });
    }

    return rewards;
}

/**
 * Get unclaimed rewards
 */
export function getUnclaimedRewards(user: User): PlayerReward[] {
    const availableRewards = getAvailableRewards(user.player_level);
    const claimedRewardIds = user.rewards_claimed || [];

    return availableRewards.filter(reward => !claimedRewardIds.includes(reward.id));
}

/**
 * Get league color styling
 */
export function getLeagueColors(league: League) {
    switch (league) {
        case "Bronze":
            return {
                primary: "text-amber-600",
                secondary: "text-amber-500",
                background: "bg-amber-500/10",
                border: "border-amber-500/30",
                gradient: "from-amber-600 to-amber-800",
            };
        case "Silver":
            return {
                primary: "text-gray-300",
                secondary: "text-gray-400",
                background: "bg-gray-400/10",
                border: "border-gray-400/30",
                gradient: "from-gray-300 to-gray-500",
            };
        case "Gold":
            return {
                primary: "text-yellow-400",
                secondary: "text-yellow-300",
                background: "bg-yellow-400/10",
                border: "border-yellow-400/30",
                gradient: "from-yellow-400 to-yellow-600",
            };
        case "Diamond":
            return {
                primary: "text-cyan-400",
                secondary: "text-cyan-300",
                background: "bg-cyan-400/10",
                border: "border-cyan-400/30",
                gradient: "from-cyan-400 to-blue-500",
            };
    }
}

/**
 * Get league icon name for UI
 */
export function getLeagueIcon(league: League): string {
    switch (league) {
        case "Bronze":
            return "Award";
        case "Silver":
            return "Medal";
        case "Gold":
            return "Trophy";
        case "Diamond":
            return "Crown";
    }
}

/**
 * Check if user should be promoted
 */
export function shouldUpdateUserStats(user: User): {
    levelChanged: boolean;
    leagueChanged: boolean;
    newLevel: number;
    newLeague: League;
} {
    const newLevel = calculatePlayerLevel(user);
    const newLeague = calculateLeague(user);

    return {
        levelChanged: newLevel !== user.player_level,
        leagueChanged: newLeague !== user.league,
        newLevel,
        newLeague,
    };
}