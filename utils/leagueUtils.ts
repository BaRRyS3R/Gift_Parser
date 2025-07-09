// src/utils/leagueUtils.ts - Utility functions for league system

import type { League } from "@/lib/league_service";

/**
 * Get league icon component based on league name
 */
export const getLeagueIcon = (leagueName: string) => {
    // These should be imported from lucide-react when used
    switch (leagueName) {
        case 'bronze':
            return 'Trophy'; // Bronze trophy
        case 'silver':
            return 'Medal'; // Silver medal
        case 'gold':
            return 'Award'; // Gold award
        case 'platinum':
            return 'Crown'; // Platinum crown
        case 'diamond':
            return 'Star'; // Diamond star
        default:
            return 'Trophy';
    }
};

/**
 * Get league color classes for consistent styling
 */
export const getLeagueColorClasses = (leagueName: string) => {
    switch (leagueName) {
        case 'bronze':
            return {
                text: 'text-orange-400',
                bg: 'bg-orange-500/10',
                border: 'border-orange-400/30',
                accent: 'text-orange-300',
                gradient: 'from-orange-500/20 to-orange-600/20'
            };
        case 'silver':
            return {
                text: 'text-gray-300',
                bg: 'bg-gray-500/10',
                border: 'border-gray-400/30',
                accent: 'text-gray-200',
                gradient: 'from-gray-400/20 to-gray-500/20'
            };
        case 'gold':
            return {
                text: 'text-yellow-400',
                bg: 'bg-yellow-500/10',
                border: 'border-yellow-400/30',
                accent: 'text-yellow-300',
                gradient: 'from-yellow-500/20 to-yellow-600/20'
            };
        case 'platinum':
            return {
                text: 'text-purple-300',
                bg: 'bg-purple-500/10',
                border: 'border-purple-400/30',
                accent: 'text-purple-200',
                gradient: 'from-purple-400/20 to-purple-500/20'
            };
        case 'diamond':
            return {
                text: 'text-cyan-300',
                bg: 'bg-cyan-500/10',
                border: 'border-cyan-400/30',
                accent: 'text-cyan-200',
                gradient: 'from-cyan-400/20 to-cyan-500/20'
            };
        default:
            return {
                text: 'text-white',
                bg: 'bg-white/10',
                border: 'border-white/30',
                accent: 'text-white/80',
                gradient: 'from-white/10 to-white/20'
            };
    }
};

/**
 * Get league hex color for direct use in styles
 */
export const getLeagueHexColor = (leagueName: string): string => {
    switch (leagueName) {
        case 'bronze': return '#CD7F32';
        case 'silver': return '#C0C0C0';
        case 'gold': return '#FFD700';
        case 'platinum': return '#E5E4E2';
        case 'diamond': return '#B9F2FF';
        default: return '#FFFFFF';
    }
};

/**
 * Calculate level from games count
 */
export const calculateLevel = (gamesCount: number): number => {
    const GAMES_PER_LEVEL = 100;
    const MAX_LEVEL = 100;

    const level = Math.floor(gamesCount / GAMES_PER_LEVEL) + 1;
    return Math.min(level, MAX_LEVEL);
};

/**
 * Get games needed for next level
 */
export const getGamesToNextLevel = (currentGames: number): number => {
    const GAMES_PER_LEVEL = 100;
    const MAX_LEVEL = 100;

    const currentLevel = calculateLevel(currentGames);

    if (currentLevel >= MAX_LEVEL) {
        return 0; // Already at max level
    }

    const nextLevelGames = currentLevel * GAMES_PER_LEVEL;
    return nextLevelGames - currentGames;
};

/**
 * Get progress percentage to next level
 */
export const getLevelProgress = (currentGames: number): number => {
    const GAMES_PER_LEVEL = 100;
    const MAX_LEVEL = 100;

    const currentLevel = calculateLevel(currentGames);

    if (currentLevel >= MAX_LEVEL) {
        return 100;
    }

    const gamesInCurrentLevel = currentGames % GAMES_PER_LEVEL;
    return Math.round((gamesInCurrentLevel / GAMES_PER_LEVEL) * 100);
};

/**
 * Determine league by games count
 */
export const getLeagueByGames = (gamesCount: number): string => {
    if (gamesCount >= 4000) return 'diamond';
    if (gamesCount >= 2000) return 'platinum';
    if (gamesCount >= 800) return 'gold';
    if (gamesCount >= 300) return 'silver';
    return 'bronze';
};

/**
 * Get league requirements
 */
export const getLeagueRequirements = (leagueName: string): { min: number; max: number | null } => {
    switch (leagueName) {
        case 'bronze': return { min: 0, max: 299 };
        case 'silver': return { min: 300, max: 799 };
        case 'gold': return { min: 800, max: 1999 };
        case 'platinum': return { min: 2000, max: 3999 };
        case 'diamond': return { min: 4000, max: null };
        default: return { min: 0, max: 299 };
    }
};

/**
 * Get games needed to reach specific league
 */
export const getGamesToLeague = (currentGames: number, targetLeague: string): number => {
    const requirements = getLeagueRequirements(targetLeague);
    return Math.max(0, requirements.min - currentGames);
};

/**
 * Check if user can get reward in league
 */
export const canGetRewardInLeague = (leagueName: string): boolean => {
    return leagueName !== 'bronze'; // Bronze league has no rewards
};

/**
 * Format league name for display
 */
export const formatLeagueName = (leagueName: string): string => {
    return leagueName.charAt(0).toUpperCase() + leagueName.slice(1) + ' League';
};

/**
 * Get league rank/position name
 */
export const getLeagueRankName = (leagueName: string): string => {
    switch (leagueName) {
        case 'bronze': return 'Novice';
        case 'silver': return 'Competitor';
        case 'gold': return 'Champion';
        case 'platinum': return 'Elite';
        case 'diamond': return 'Legend';
        default: return 'Player';
    }
};

/**
 * Check if league is higher than another
 */
export const isHigherLeague = (league1: string, league2: string): boolean => {
    const leagueOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const index1 = leagueOrder.indexOf(league1);
    const index2 = leagueOrder.indexOf(league2);

    return index1 > index2;
};

/**
 * Get league progression path
 */
export const getLeagueProgression = (currentLeague: string): string[] => {
    const allLeagues = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = allLeagues.indexOf(currentLeague);

    if (currentIndex === -1) return allLeagues;

    return allLeagues.slice(0, currentIndex + 1);
};

/**
 * Get next league in progression
 */
export const getNextLeague = (currentLeague: string): string | null => {
    const allLeagues = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = allLeagues.indexOf(currentLeague);

    if (currentIndex === -1 || currentIndex === allLeagues.length - 1) {
        return null; // Already at highest league or invalid league
    }

    return allLeagues[currentIndex + 1];
};

/**
 * Calculate league progress percentage
 */
export const getLeagueProgressPercentage = (
    currentGames: number,
    currentLeague: League,
    nextLeague: League | null
): number => {
    if (!nextLeague) {
        return 100; // At max league
    }

    const leagueRange = nextLeague.min_games - currentLeague.min_games;
    const currentProgress = currentGames - currentLeague.min_games;

    return Math.min(100, Math.round((currentProgress / leagueRange) * 100));
};