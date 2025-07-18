// src/lib/server/leaderboardService.ts - Dedicated leaderboard service module

import { supabaseServer } from '@/lib/supabase_server';

// Cache configuration
const LEADERBOARD_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const leaderboardCache = new Map<string, { data: any; timestamp: number }>();

// Leaderboard interfaces (without sensitive data)
export interface SafeReactionLeaderboard {
    position: number;
    first_name: string;
    last_name?: string;
    username?: string;
    best_reaction_time: number;
    reaction_games: number;
    best_reaction_score: number;
    isCurrentUser?: boolean;
}

export interface SafeSurvivalLeaderboard {
    position: number;
    first_name: string;
    last_name?: string;
    username?: string;
    best_survival_time: number;
    max_level: number;
    best_streak: number;
    survival_games: number;
    isCurrentUser?: boolean;
}

export interface SafePhysicsLeaderboard {
    position: number;
    first_name: string;
    last_name?: string;
    username?: string;
    best_physics_score: number;
    best_physics_time: number;
    best_hits: number;
    least_mistakes: number;
    physics_games: number;
    isCurrentUser?: boolean;
}

export interface SafeRotationLeaderboard {
    position: number;
    first_name: string;
    last_name?: string;
    username?: string;
    best_rotation_time: number;
    max_level: number;
    best_streak: number;
    total_hits: number;
    rotation_games: number;
    isCurrentUser?: boolean;
}

export interface UserRankings {
    reaction?: number;
    survival?: number;
    physics?: number;
    rotation?: number;
}

export interface AllLeaderboardsResponse {
    reaction: SafeReactionLeaderboard[];
    survival: SafeSurvivalLeaderboard[];
    physics: SafePhysicsLeaderboard[];
    rotation: SafeRotationLeaderboard[];
    userRankings: UserRankings;
    cacheInfo: {
        lastUpdated: string;
        nextUpdate: string;
    };
}

// Helper function to check cache validity
function isCacheValid(cacheKey: string): boolean {
    const cached = leaderboardCache.get(cacheKey);
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < LEADERBOARD_CACHE_DURATION;
}

// Helper function to get cache
function getFromCache<T>(cacheKey: string): T | null {
    const cached = leaderboardCache.get(cacheKey);
    if (!cached || !isCacheValid(cacheKey)) return null;
    
    return cached.data as T;
}

// Helper function to set cache
function setCache(cacheKey: string, data: any): void {
    leaderboardCache.set(cacheKey, {
        data,
        timestamp: Date.now()
    });
}

// Server-side leaderboard service
export const serverLeaderboardService = {
    /**
     * Get reaction mode leaderboard with safe data
     */
    async getReactionLeaderboard(currentUserId: string, limit: number = 100): Promise<SafeReactionLeaderboard[]> {
        const cacheKey = `reaction_leaderboard_${limit}`;
        
        // Try to get from cache first
        const cached = getFromCache<SafeReactionLeaderboard[]>(cacheKey);
        if (cached) {
            console.log('Returning cached reaction leaderboard');
            // Mark current user in cached data
            return cached.map(entry => ({
                ...entry,
                isCurrentUser: entry.isCurrentUser || false // Will be updated below
            }));
        }

        const { data, error } = await supabaseServer
            .from("users")
            .select(`
                id,
                first_name,
                last_name,
                username,
                reaction_best_time,
                reaction_games,
                reaction_best_score
            `)
            .gt("reaction_games", 0)
            .gt("reaction_best_time", 0)
            .order("reaction_best_time", { ascending: true })
            .order("reaction_best_score", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching reaction leaderboard:", error);
            throw new Error("Failed to fetch reaction leaderboard");
        }

        const leaderboard = (data || []).map((user: any, index: number) => ({
            position: index + 1,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            best_reaction_time: user.reaction_best_time,
            reaction_games: user.reaction_games,
            best_reaction_score: user.reaction_best_score,
            isCurrentUser: user.id === currentUserId,
        }));

        // Cache the result
        setCache(cacheKey, leaderboard);
        
        return leaderboard;
    },

    /**
     * Get survival mode leaderboard with safe data
     */
    async getSurvivalLeaderboard(currentUserId: string, limit: number = 100): Promise<SafeSurvivalLeaderboard[]> {
        const cacheKey = `survival_leaderboard_${limit}`;
        
        const cached = getFromCache<SafeSurvivalLeaderboard[]>(cacheKey);
        if (cached) {
            console.log('Returning cached survival leaderboard');
            return cached.map(entry => ({
                ...entry,
                isCurrentUser: entry.isCurrentUser || false
            }));
        }

        const { data, error } = await supabaseServer
            .from("users")
            .select(`
                id,
                first_name,
                last_name,
                username,
                survival_best_time,
                survival_max_level,
                survival_best_streak,
                survival_games
            `)
            .gt("survival_games", 0)
            .order("survival_best_time", { ascending: false })
            .order("survival_max_level", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching survival leaderboard:", error);
            throw new Error("Failed to fetch survival leaderboard");
        }

        const leaderboard = (data || []).map((user: any, index: number) => ({
            position: index + 1,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            best_survival_time: user.survival_best_time,
            max_level: user.survival_max_level,
            best_streak: user.survival_best_streak,
            survival_games: user.survival_games,
            isCurrentUser: user.id === currentUserId,
        }));

        setCache(cacheKey, leaderboard);
        return leaderboard;
    },

    /**
     * Get physics mode leaderboard with safe data
     */
    async getPhysicsLeaderboard(currentUserId: string, limit: number = 100): Promise<SafePhysicsLeaderboard[]> {
        const cacheKey = `physics_leaderboard_${limit}`;
        
        const cached = getFromCache<SafePhysicsLeaderboard[]>(cacheKey);
        if (cached) {
            console.log('Returning cached physics leaderboard');
            return cached.map(entry => ({
                ...entry,
                isCurrentUser: entry.isCurrentUser || false
            }));
        }

        const { data, error } = await supabaseServer
            .from("users")
            .select(`
                id,
                first_name,
                last_name,
                username,
                physics_best_score,
                physics_best_time,
                physics_best_hits,
                physics_least_mistakes,
                physics_games
            `)
            .gt("physics_games", 0)
            .order("physics_best_score", { ascending: false })
            .order("physics_best_time", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching physics leaderboard:", error);
            throw new Error("Failed to fetch physics leaderboard");
        }

        const leaderboard = (data || []).map((user: any, index: number) => ({
            position: index + 1,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            best_physics_score: user.physics_best_score,
            best_physics_time: user.physics_best_time,
            best_hits: user.physics_best_hits,
            least_mistakes: user.physics_least_mistakes,
            physics_games: user.physics_games,
            isCurrentUser: user.id === currentUserId,
        }));

        setCache(cacheKey, leaderboard);
        return leaderboard;
    },

    /**
     * Get rotation mode leaderboard with safe data
     */
    async getRotationLeaderboard(currentUserId: string, limit: number = 100): Promise<SafeRotationLeaderboard[]> {
        const cacheKey = `rotation_leaderboard_${limit}`;
        
        const cached = getFromCache<SafeRotationLeaderboard[]>(cacheKey);
        if (cached) {
            console.log('Returning cached rotation leaderboard');
            return cached.map(entry => ({
                ...entry,
                isCurrentUser: entry.isCurrentUser || false
            }));
        }

        const { data, error } = await supabaseServer
            .from("users")
            .select(`
                id,
                first_name,
                last_name,
                username,
                rotation_best_time,
                rotation_max_level,
                rotation_best_streak,
                rotation_total_hits,
                rotation_games
            `)
            .gt("rotation_games", 0)
            .order("rotation_best_time", { ascending: false })
            .order("rotation_max_level", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching rotation leaderboard:", error);
            throw new Error("Failed to fetch rotation leaderboard");
        }

        const leaderboard = (data || []).map((user: any, index: number) => ({
            position: index + 1,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            best_rotation_time: user.rotation_best_time,
            max_level: user.rotation_max_level,
            best_streak: user.rotation_best_streak,
            total_hits: user.rotation_total_hits,
            rotation_games: user.rotation_games,
            isCurrentUser: user.id === currentUserId,
        }));

        setCache(cacheKey, leaderboard);
        return leaderboard;
    },

    /**
     * Get user rankings across all leaderboards
     */
    async getUserRankings(telegramId: number): Promise<UserRankings> {
        const cacheKey = `user_rankings_${telegramId}`;
        
        const cached = getFromCache<UserRankings>(cacheKey);
        if (cached) {
            console.log('Returning cached user rankings');
            return cached;
        }

        // Get user data
        const { data: user, error: userError } = await supabaseServer
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();

        if (userError || !user) {
            throw new Error('User not found');
        }

        const rankings: UserRankings = {};

        // Reaction ranking
        if (user.reaction_games > 0 && user.reaction_best_time > 0) {
            const { count, error: reactionError } = await supabaseServer
                .from("users")
                .select("id", { count: "exact" })
                .gt("reaction_games", 0)
                .gt("reaction_best_time", 0)
                .lt("reaction_best_time", user.reaction_best_time);

            if (!reactionError) {
                rankings.reaction = (count || 0) + 1;
            }
        }

        // Survival ranking
        if (user.survival_games > 0) {
            const { count, error: survivalError } = await supabaseServer
                .from("users")
                .select("id", { count: "exact" })
                .gt("survival_games", 0)
                .or(`survival_best_time.gt.${user.survival_best_time},and(survival_best_time.eq.${user.survival_best_time},survival_max_level.gt.${user.survival_max_level})`);

            if (!survivalError) {
                rankings.survival = (count || 0) + 1;
            }
        }

        // Physics ranking
        if (user.physics_games > 0) {
            const { count, error: physicsError } = await supabaseServer
                .from("users")
                .select("id", { count: "exact" })
                .gt("physics_games", 0)
                .or(`physics_best_score.gt.${user.physics_best_score},and(physics_best_score.eq.${user.physics_best_score},physics_best_time.gt.${user.physics_best_time})`);

            if (!physicsError) {
                rankings.physics = (count || 0) + 1;
            }
        }

        // Rotation ranking
        if (user.rotation_games > 0) {
            const { count, error: rotationError } = await supabaseServer
                .from("users")
                .select("id", { count: "exact" })
                .gt("rotation_games", 0)
                .or(`rotation_best_time.gt.${user.rotation_best_time},and(rotation_best_time.eq.${user.rotation_best_time},rotation_max_level.gt.${user.rotation_max_level})`);

            if (!rotationError) {
                rankings.rotation = (count || 0) + 1;
            }
        }

        // Cache rankings for shorter time (5 minutes)
        const rankingsCacheKey = `user_rankings_${telegramId}`;
        leaderboardCache.set(rankingsCacheKey, {
            data: rankings,
            timestamp: Date.now()
        });

        return rankings;
    },

    /**
     * Get all leaderboards in a single request
     */
    async getAllLeaderboards(
        currentUserId: string, 
        telegramId: number, 
        limit: number = 100
    ): Promise<AllLeaderboardsResponse> {
        try {
            console.log(`Fetching all leaderboards for user: ${currentUserId}`);

            const [reaction, survival, physics, rotation, userRankings] = await Promise.all([
                this.getReactionLeaderboard(currentUserId, limit),
                this.getSurvivalLeaderboard(currentUserId, limit),
                this.getPhysicsLeaderboard(currentUserId, limit),
                this.getRotationLeaderboard(currentUserId, limit),
                this.getUserRankings(telegramId),
            ]);

            // Mark current user in all leaderboards
            const markCurrentUser = <T extends { isCurrentUser?: boolean, position: number }>(
                leaderboard: T[]
            ): T[] => {
                return leaderboard.map(entry => ({
                    ...entry,
                    isCurrentUser: entry.isCurrentUser || false
                }));
            };

            const now = new Date();
            const nextUpdate = new Date(now.getTime() + LEADERBOARD_CACHE_DURATION);

            return {
                reaction: markCurrentUser(reaction),
                survival: markCurrentUser(survival),
                physics: markCurrentUser(physics),
                rotation: markCurrentUser(rotation),
                userRankings,
                cacheInfo: {
                    lastUpdated: now.toISOString(),
                    nextUpdate: nextUpdate.toISOString(),
                }
            };

        } catch (error) {
            console.error('Error fetching all leaderboards:', error);
            throw new Error('Failed to fetch leaderboards');
        }
    },

    /**
     * Clear leaderboard cache (useful for manual refresh)
     */
    clearCache(): void {
        leaderboardCache.clear();
        console.log('Leaderboard cache cleared');
    },

    /**
     * Get cache status
     */
    getCacheStatus(): { size: number; keys: string[] } {
        return {
            size: leaderboardCache.size,
            keys: Array.from(leaderboardCache.keys())
        };
    }
};