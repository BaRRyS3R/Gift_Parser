// src/utils/leagueSystem.ts - Fixed league system utilities with reduced requirements

import type { League, User, PlayerReward } from "@/lib/supabase";

// Constants for level calculation - UPDATED: Reduced games per level
export const LEVEL_CONSTANTS = {
    GAMES_PER_LEVEL: 10, // CHANGED: From 100 to 10 games per level
    MAX_LEVEL: 100,
    MIN_LEVEL: 1,
    REWARD_INTERVAL: 20, // Every 20 levels
} as const;

// Constants for league calculation - UPDATED: Adjusted for new level progression
export const LEAGUE_REQUIREMENTS = {
    Bronze: 0,    // Default league
    Silver: 12,    // CHANGED: 5+ total games (was 50)
    Gold: 40,     // CHANGED: 20+ total games (was 200)  
    Diamond: 100,  // CHANGED: 50+ total games (was 500)
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
 * Get available rewards for player level - FIXED: Use calculated level
 */
export function getAvailableRewards(user: User): PlayerReward[] {
    const rewards: PlayerReward[] = [];

    // Use the calculated level, not the stored level
    const currentLevel = calculatePlayerLevel(user);

    for (let level = LEVEL_CONSTANTS.REWARD_INTERVAL; level <= currentLevel; level += LEVEL_CONSTANTS.REWARD_INTERVAL) {
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
 * Get unclaimed rewards - FIXED: Use user object instead of just level
 */
export function getUnclaimedRewards(user: User): PlayerReward[] {
    const availableRewards = getAvailableRewards(user);
    const claimedRewardIds = user.rewards_claimed || [];

    return availableRewards.filter(reward => !claimedRewardIds.includes(reward.id));
}

/**
 * Check if specific reward is available for user - NEW: Direct check function
 */
export function isRewardAvailable(user: User, rewardLevel: number): boolean {
    const currentLevel = calculatePlayerLevel(user);
    return currentLevel >= rewardLevel;
}

/**
 * Get all possible rewards (for display purposes) - FIXED: Return all rewards with availability status
 */
export function getAllRewardsWithStatus(user: User): Array<PlayerReward & {
    isAvailable: boolean;
    isClaimed: boolean
}> {
    const allRewards: Array<PlayerReward & { isAvailable: boolean; isClaimed: boolean }> = [];
    const currentLevel = calculatePlayerLevel(user);
    const claimedRewardIds = user.rewards_claimed || [];

    for (let level = LEVEL_CONSTANTS.REWARD_INTERVAL; level <= 100; level += LEVEL_CONSTANTS.REWARD_INTERVAL) {
        const rewardNumber = level / LEVEL_CONSTANTS.REWARD_INTERVAL;
        const rewardId = `test_gift_${rewardNumber}`;

        allRewards.push({
            id: rewardId,
            level: level,
            name: `Test Gift ${rewardNumber}`,
            description: `Reward for reaching level ${level}`,
            isAvailable: currentLevel >= level,
            isClaimed: claimedRewardIds.includes(rewardId),
        });
    }

    return allRewards;
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
 * Check if user should be promoted - ENHANCED: Include detailed change information
 */
export function shouldUpdateUserStats(user: User): {
    levelChanged: boolean;
    leagueChanged: boolean;
    newLevel: number;
    newLeague: League;
    previousLevel: number;
    previousLeague: League;
    hasNewRewards: boolean;
} {
    const newLevel = calculatePlayerLevel(user);
    const newLeague = calculateLeague(user);
    const previousLevel = user.player_level || 1;
    const previousLeague = user.league || "Bronze";

    // Check if any new rewards are available
    const hasNewRewards = newLevel >= LEVEL_CONSTANTS.REWARD_INTERVAL &&
        (newLevel - previousLevel) >= LEVEL_CONSTANTS.REWARD_INTERVAL;

    return {
        levelChanged: newLevel !== previousLevel,
        leagueChanged: newLeague !== previousLeague,
        newLevel,
        newLeague,
        previousLevel,
        previousLeague,
        hasNewRewards,
    };
}

/**
 * Get next reward level for user - NEW: Helper for reward progression
 */
export function getNextRewardLevel(user: User): number | null {
    const currentLevel = calculatePlayerLevel(user);
    const nextRewardLevel = Math.ceil((currentLevel + 1) / LEVEL_CONSTANTS.REWARD_INTERVAL) * LEVEL_CONSTANTS.REWARD_INTERVAL;

    return nextRewardLevel <= 100 ? nextRewardLevel : null;
}

/**
 * Calculate levels until next reward - NEW: Helper for reward progression display
 */
export function getLevelsToNextReward(user: User): number {
    const nextRewardLevel = getNextRewardLevel(user);
    if (!nextRewardLevel) return 0;

    const currentLevel = calculatePlayerLevel(user);
    return Math.max(0, nextRewardLevel - currentLevel);
}