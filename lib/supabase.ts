// src/lib/supabase.ts - Enhanced with Precision Mode Support

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Enhanced database types with Precision Mode support
export interface User {
    id: string; // UUID v4
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium: boolean;
    created_at: string;
    updated_at: string;

    // General game statistics
    total_games: number;
    total_score: number;
    best_score: number;
    total_correct_hits: number;
    total_wrong_hits: number;
    total_missed_circles: number;
    best_accuracy: number;

    // Standard difficulty statistics
    easy_games: number;
    easy_best_score: number;
    medium_games: number;
    medium_best_score: number;
    hard_games: number;
    hard_best_score: number;
    legendary_games: number;
    legendary_best_score: number;
    omg_games: number;
    omg_best_score: number;
    nightmare_games: number;
    nightmare_best_score: number;
    impossible_games: number;
    impossible_best_score: number;

    // Precision Mode specific statistics
    precision_games: number;
    precision_best_score: number;
    precision_best_survival_time: number; // in milliseconds
    precision_max_intensity: number;
    precision_best_streak: number;

    // Enhanced general statistics
    total_decoy_hits?: number;
    total_fast_hits?: number;
    best_reaction_time?: number;
    max_adaptive_level?: number;

    last_played_at?: string;
    is_active: boolean;
}

export interface GameResultDB {
    id: string; // UUID v4
    user_id: string; // UUID v4
    difficulty: string;
    score: number;
    correct_hits: number;
    wrong_hits: number;
    missed_circles: number;
    accuracy: number;
    duration: number;

    // Enhanced fields for all modes
    decoy_hits?: number;
    fast_hits?: number;
    average_reaction_time?: number;
    adaptive_level?: number;

    // Precision Mode specific fields
    survival_time?: number; // in milliseconds
    max_intensity_reached?: number;
    perfect_streak?: number;
    death_cause?: string; // 'miss' | 'wrong_click' | 'decoy_hit' | 'timeout'

    created_at: string;
}

export interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
}

export interface LeaderboardEntry {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    is_premium: boolean;
    best_score: number;
    total_games: number;
    best_accuracy: number;
    last_played_at?: string;
}

export interface DifficultyLeaderboard {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    is_premium: boolean;
    difficulty_best_score: number;
    difficulty_games: number;
    last_played_at?: string;
}

// Precision Mode specific leaderboard interface
export interface PrecisionLeaderboard {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    is_premium: boolean;
    best_survival_time: number;
    max_intensity: number;
    best_streak: number;
    total_precision_games: number;
    last_played_at?: string;
}

// Enhanced user service with Precision Mode support
export const userService = {
    async findByTelegramId(telegramId: number): Promise<User | null> {
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("telegram_id", telegramId)
            .maybeSingle();

        if (error) {
            console.error("Error finding user:", error);
            throw error;
        }

        return data;
    },

    async create(telegramUser: TelegramUser): Promise<User> {
        const userData = {
            telegram_id: telegramUser.id,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name || null,
            username: telegramUser.username || null,
            language_code: telegramUser.language_code || null,
            is_premium: telegramUser.is_premium || false,
        };

        const { data, error } = await supabase
            .from("users")
            .insert(userData)
            .select()
            .single();

        if (error) {
            console.error("Error creating user:", error);
            throw error;
        }

        return data;
    },

    async updateGameStats(telegramId: number, gameResult: any): Promise<void> {
        const user = await this.findByTelegramId(telegramId);
        if (!user) throw new Error("User not found");

        const difficultyField = `${gameResult.difficulty}_games`;
        const difficultyBestField = `${gameResult.difficulty}_best_score`;

        const updates: any = {
            total_games: user.total_games + 1,
            total_score: user.total_score + gameResult.score,
            best_score: Math.max(user.best_score, gameResult.score),
            total_correct_hits: user.total_correct_hits + gameResult.correctHits,
            total_wrong_hits: user.total_wrong_hits + gameResult.wrongHits,
            total_missed_circles: user.total_missed_circles + gameResult.missedCircles,
            best_accuracy: Math.max(user.best_accuracy, gameResult.accuracy),
            [difficultyField]: (user as any)[difficultyField] + 1,
            [difficultyBestField]: Math.max(
                (user as any)[difficultyBestField],
                gameResult.score,
            ),
            last_played_at: new Date().toISOString(),
        };

        // Precision Mode specific updates
        if (gameResult.difficulty === 'precision') {
            updates.precision_best_survival_time = Math.max(
                user.precision_best_survival_time || 0,
                gameResult.survivalTime || 0
            );
            updates.precision_max_intensity = Math.max(
                user.precision_max_intensity || 0,
                gameResult.maxIntensityReached || 0
            );
            updates.precision_best_streak = Math.max(
                user.precision_best_streak || 0,
                gameResult.perfectStreak || 0
            );
        }

        // Enhanced metrics updates
        if (gameResult.decoyHits !== undefined) {
            updates.total_decoy_hits = (user.total_decoy_hits || 0) + gameResult.decoyHits;
        }

        if (gameResult.fastHits !== undefined) {
            updates.total_fast_hits = (user.total_fast_hits || 0) + gameResult.fastHits;
        }

        if (gameResult.averageReactionTime !== undefined && gameResult.averageReactionTime > 0) {
            if (!user.best_reaction_time || gameResult.averageReactionTime < user.best_reaction_time) {
                updates.best_reaction_time = gameResult.averageReactionTime;
            }
        }

        if (gameResult.adaptiveLevel !== undefined) {
            updates.max_adaptive_level = Math.max(
                user.max_adaptive_level || 0,
                gameResult.adaptiveLevel
            );
        }

        const { error } = await supabase
            .from("users")
            .update(updates)
            .eq("telegram_id", telegramId);

        if (error) {
            console.error("Error updating user stats:", error);
            throw error;
        }
    },

    async saveGameResult(telegramId: number, gameResult: any): Promise<void> {
        const user = await this.findByTelegramId(telegramId);
        if (!user) throw new Error("User not found");

        const resultData: any = {
            user_id: user.id,
            difficulty: gameResult.difficulty,
            score: gameResult.score,
            correct_hits: gameResult.correctHits,
            wrong_hits: gameResult.wrongHits,
            missed_circles: gameResult.missedCircles,
            accuracy: gameResult.accuracy,
            duration: gameResult.duration,
        };

        // Standard enhanced fields
        if (gameResult.decoyHits !== undefined) {
            resultData.decoy_hits = gameResult.decoyHits;
        }

        if (gameResult.fastHits !== undefined) {
            resultData.fast_hits = gameResult.fastHits;
        }

        if (gameResult.averageReactionTime !== undefined) {
            resultData.average_reaction_time = gameResult.averageReactionTime;
        }

        if (gameResult.adaptiveLevel !== undefined) {
            resultData.adaptive_level = gameResult.adaptiveLevel;
        }

        // Precision Mode specific fields
        if (gameResult.survivalTime !== undefined) {
            resultData.survival_time = gameResult.survivalTime;
        }

        if (gameResult.maxIntensityReached !== undefined) {
            resultData.max_intensity_reached = gameResult.maxIntensityReached;
        }

        if (gameResult.perfectStreak !== undefined) {
            resultData.perfect_streak = gameResult.perfectStreak;
        }

        if (gameResult.deathCause !== undefined) {
            resultData.death_cause = gameResult.deathCause;
        }

        console.log('Saving game result with data:', resultData);

        const { error } = await supabase.from("game_results").insert(resultData);

        if (error) {
            console.error("Error saving game result:", error);
            throw error;
        }

        await this.updateGameStats(telegramId, gameResult);
    },

    async getGameHistory(telegramId: number, limit: number = 50): Promise<GameResultDB[]> {
        const user = await this.findByTelegramId(telegramId);
        if (!user) return [];

        const { data, error } = await supabase
            .from("game_results")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching game history:", error);
            throw error;
        }

        return data || [];
    },

    async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
        const { data, error } = await supabase
            .from("users")
            .select(`
                id,
                telegram_id,
                first_name,
                last_name,
                username,
                is_premium,
                best_score,
                total_games,
                best_accuracy,
                last_played_at
            `)
            .gt('total_games', 0)
            .order("best_score", { ascending: false })
            .order("best_accuracy", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching leaderboard:", error);
            throw error;
        }

        return data || [];
    },

    async getDifficultyLeaderboard(difficulty: string, limit: number = 100): Promise<DifficultyLeaderboard[]> {
        const scoreField = `${difficulty}_best_score`;
        const gamesField = `${difficulty}_games`;

        const { data, error } = await supabase
            .from("users")
            .select(`
                id,
                telegram_id,
                first_name,
                last_name,
                username,
                is_premium,
                ${scoreField},
                ${gamesField},
                last_played_at
            `)
            .gt(gamesField, 0)
            .order(scoreField, { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching difficulty leaderboard:", error);
            throw error;
        }

        return (data || []).map((user: any) => ({
            ...user,
            difficulty_best_score: user[scoreField],
            difficulty_games: user[gamesField]
        }));
    },

    // New Precision Mode leaderboard methods
    async getPrecisionLeaderboard(limit: number = 100): Promise<PrecisionLeaderboard[]> {
        const { data, error } = await supabase
            .from("users")
            .select(`
                id,
                telegram_id,
                first_name,
                last_name,
                username,
                is_premium,
                precision_best_survival_time,
                precision_max_intensity,
                precision_best_streak,
                precision_games,
                last_played_at
            `)
            .gt('precision_games', 0)
            .order("precision_best_survival_time", { ascending: false })
            .order("precision_max_intensity", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching precision leaderboard:", error);
            throw error;
        }

        return (data || []).map((user: any) => ({
            ...user,
            best_survival_time: user.precision_best_survival_time,
            max_intensity: user.precision_max_intensity,
            best_streak: user.precision_best_streak,
            total_precision_games: user.precision_games
        }));
    },

    async getUserRanking(telegramId: number): Promise<number | null> {
        const user = await this.findByTelegramId(telegramId);
        if (!user || user.total_games === 0) return null;

        const { count, error } = await supabase
            .from("users")
            .select("id", { count: "exact" })
            .gt('total_games', 0)
            .or(`best_score.gt.${user.best_score},and(best_score.eq.${user.best_score},best_accuracy.gt.${user.best_accuracy})`);

        if (error) {
            console.error("Error fetching user ranking:", error);
            throw error;
        }

        return (count || 0) + 1;
    },

    async getUserDifficultyRanking(telegramId: number, difficulty: string): Promise<number | null> {
        const user = await this.findByTelegramId(telegramId);
        if (!user) return null;

        const scoreField = `${difficulty}_best_score`;
        const gamesField = `${difficulty}_games`;
        const userScore = (user as any)[scoreField];
        const userGames = (user as any)[gamesField];

        if (userGames === 0) return null;

        const { count, error } = await supabase
            .from("users")
            .select("id", { count: "exact" })
            .gt(gamesField, 0)
            .gt(scoreField, userScore);

        if (error) {
            console.error("Error fetching user difficulty ranking:", error);
            throw error;
        }

        return (count || 0) + 1;
    },

    async getUserPrecisionRanking(telegramId: number): Promise<number | null> {
        const user = await this.findByTelegramId(telegramId);
        if (!user || user.precision_games === 0) return null;

        const { count, error } = await supabase
            .from("users")
            .select("id", { count: "exact" })
            .gt('precision_games', 0)
            .or(`precision_best_survival_time.gt.${user.precision_best_survival_time},and(precision_best_survival_time.eq.${user.precision_best_survival_time},precision_max_intensity.gt.${user.precision_max_intensity})`);

        if (error) {
            console.error("Error fetching user precision ranking:", error);
            throw error;
        }

        return (count || 0) + 1;
    },
};