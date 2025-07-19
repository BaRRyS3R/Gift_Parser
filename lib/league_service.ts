// src/lib/league_service.ts - Client-side utilities only (server logic moved to API)

// Re-export types from the hooks for backward compatibility
export type {
    League,
    LeagueReward,
    UserLeague,
    UserLeagueReward,
    LeagueProgressInfo,
    LeagueLeaderboard,
    LeagueNeighbors,
    CompleteLeagueData
} from '@/hooks/modules/useLeagues';

// Legacy types for backward compatibility
export interface LeagueRewardResult {
    success: boolean;
    reward_type?: 'gift' | 'attempts';
    reward?: {
        id?: number;
        name?: string;
        position: number;
        league: string;
        type?: string;
        amount?: number;
    };
    reason?: string;
    error?: string;
}

/**
 * Client-side league utilities and calculations
 * All server-side operations have been moved to /api/leagues
 */
export const leagueService = {
    // Constants
    GAMES_PER_LEVEL: 100,
    MAX_LEVEL: 100,

    /**
     * Calculate level from games count (client-side only)
     */
    calculateLevel(gamesCount: number): number {
        const level = Math.floor(gamesCount / this.GAMES_PER_LEVEL) + 1;
        return Math.min(level, this.MAX_LEVEL);
    },

    /**
     * Get games needed for next level (client-side only)
     */
    getGamesToNextLevel(currentGames: number): number {
        const currentLevel = this.calculateLevel(currentGames);

        if (currentLevel >= this.MAX_LEVEL) {
            return 0; // Already at max level
        }

        const nextLevelGames = currentLevel * this.GAMES_PER_LEVEL;
        return nextLevelGames - currentGames;
    },

    /**
     * Get progress percentage to next level (client-side only)
     */
    getLevelProgress(currentGames: number): number {
        const currentLevel = this.calculateLevel(currentGames);

        if (currentLevel >= this.MAX_LEVEL) {
            return 100;
        }

        const gamesInCurrentLevel = currentGames % this.GAMES_PER_LEVEL;
        return Math.round((gamesInCurrentLevel / this.GAMES_PER_LEVEL) * 100);
    },

    /**
     * Check if user is at max level (client-side only)
     */
    isMaxLevel(currentGames: number): boolean {
        return this.calculateLevel(currentGames) >= this.MAX_LEVEL;
    },

    /**
     * Determine league by games count (client-side estimation only)
     * Note: This is only an estimation. Use API for accurate league data.
     */
    getLeagueByGames(gamesCount: number): string {
        if (gamesCount >= 4000) return 'diamond';
        if (gamesCount >= 2000) return 'platinum';
        if (gamesCount >= 800) return 'gold';
        if (gamesCount >= 300) return 'silver';
        return 'bronze';
    },

    /**
     * Get league requirements (client-side estimation only)
     */
    getLeagueRequirements(leagueName: string): { min: number; max: number | null } {
        switch (leagueName) {
            case 'bronze': return { min: 0, max: 299 };
            case 'silver': return { min: 300, max: 799 };
            case 'gold': return { min: 800, max: 1999 };
            case 'platinum': return { min: 2000, max: 3999 };
            case 'diamond': return { min: 4000, max: null };
            default: return { min: 0, max: 299 };
        }
    },

    /**
     * Get games needed to reach specific league (client-side estimation only)
     */
    getGamesToLeague(currentGames: number, targetLeague: string): number {
        const requirements = this.getLeagueRequirements(targetLeague);
        return Math.max(0, requirements.min - currentGames);
    },

    /**
     * Check if user can get reward in league (client-side only)
     */
    canGetRewardInLeague(leagueName: string): boolean {
        return leagueName !== 'bronze'; // Bronze league has no rewards
    },

    /**
     * Format league name for display (client-side only)
     */
    formatLeagueName(leagueName: string): string {
        return leagueName.charAt(0).toUpperCase() + leagueName.slice(1) + ' League';
    },

    /**
     * Get league rank/position name (client-side only)
     */
    getLeagueRankName(leagueName: string): string {
        switch (leagueName) {
            case 'bronze': return 'Novice';
            case 'silver': return 'Competitor';
            case 'gold': return 'Champion';
            case 'platinum': return 'Elite';
            case 'diamond': return 'Legend';
            default: return 'Player';
        }
    },

    /**
     * Check if league is higher than another (client-side only)
     */
    isHigherLeague(league1: string, league2: string): boolean {
        const leagueOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
        const index1 = leagueOrder.indexOf(league1);
        const index2 = leagueOrder.indexOf(league2);

        return index1 > index2;
    },

    /**
     * Get league progression path (client-side only)
     */
    getLeagueProgression(currentLeague: string): string[] {
        const allLeagues = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
        const currentIndex = allLeagues.indexOf(currentLeague);

        if (currentIndex === -1) return allLeagues;

        return allLeagues.slice(0, currentIndex + 1);
    },

    /**
     * Get next league in progression (client-side only)
     */
    getNextLeague(currentLeague: string): string | null {
        const allLeagues = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
        const currentIndex = allLeagues.indexOf(currentLeague);

        if (currentIndex === -1 || currentIndex === allLeagues.length - 1) {
            return null; // Already at highest league or invalid league
        }

        return allLeagues[currentIndex + 1];
    },

    // DEPRECATED METHODS - Use API endpoints instead

    /**
     * @deprecated Use /api/leagues endpoint instead
     */
    async getAllLeagues(): Promise<never> {
        throw new Error('getAllLeagues has been moved to API. Use /api/leagues endpoint with useLeagues hook instead.');
    },

    /**
     * @deprecated Use /api/leagues endpoint instead
     */
    async getUserLeagueProgress(): Promise<never> {
        throw new Error('getUserLeagueProgress has been moved to API. Use /api/leagues endpoint with useLeagues hook instead.');
    },

    /**
     * @deprecated Use /api/leagues endpoint instead
     */
    async getLeagueLeaderboard(): Promise<never> {
        throw new Error('getLeagueLeaderboard has been moved to API. Use /api/leagues endpoint with useLeagues hook instead.');
    },

    /**
     * @deprecated Use /api/leagues endpoint instead
     */
    async getLeagueNeighbors(): Promise<never> {
        throw new Error('getLeagueNeighbors has been moved to API. Use /api/leagues endpoint with useLeagues hook instead.');
    },

    /**
     * @deprecated Use /api/leagues endpoint instead
     */
    async getUserRewards(): Promise<never> {
        throw new Error('getUserRewards has been moved to API. Use /api/leagues endpoint with useLeagues hook instead.');
    },

    /**
     * @deprecated Server-side operation moved to gameService
     */
    async checkAndUpdateLeague(): Promise<never> {
        throw new Error('checkAndUpdateLeague is now a server-side operation handled automatically by game API.');
    },

    /**
     * @deprecated Server-side operation moved to registration API
     */
    async initializeUserLeague(): Promise<never> {
        throw new Error('initializeUserLeague is now handled automatically during user registration.');
    },
};

export default leagueService;