// src/lib/supabase.ts - Fixed saveGameResult method to handle null reaction times

import { createClient } from "@supabase/supabase-js";

import { GameMode } from "@/types/game-modes/common";
import { ReactionGameResult } from "@/types/game-modes/reaction";
import { SurvivalGameResult } from "@/types/game-modes/survival";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Updated database types for new game structure
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

    // Reaction Mode specific statistics
    reaction_games: number;
    reaction_best_score: number;
    reaction_best_time: number; // Best reaction time in milliseconds
    reaction_average_time: number; // Average reaction time in milliseconds

    // Survival Mode specific statistics
    survival_games: number;
    survival_best_score: number;
    survival_best_time: number; // Best survival time in milliseconds
    survival_max_level: number; // Maximum level reached
    survival_best_streak: number; // Best perfect streak

    // Legacy fields (for backward compatibility)
    total_correct_hits: number;
    total_wrong_hits: number;
    total_missed_circles: number;
    best_accuracy: number;

    last_played_at?: string;
    is_active: boolean;
}

export interface GameResultDB {
    id: string; // UUID v4
    user_id: string; // UUID v4
    game_mode: GameMode; // 'reaction' | 'survival'
    score: number;
    duration: number;

    // Reaction Mode specific fields
    reaction_time?: number; // milliseconds
    reaction_rating?:
    | "LIGHTNING"
    | "EXCELLENT"
    | "GOOD"
    | "AVERAGE"
    | "SLOW"
    | "MISSED";
    missed_target?: boolean;

    // Survival Mode specific fields
    survival_time?: number; // milliseconds
    max_level_reached?: number;
    perfect_streak?: number;
    correct_hits?: number;
    death_cause?: "miss" | "wrong_click" | "decoy_hit" | "timeout";

    // Legacy fields (for backward compatibility)
    wrong_hits?: number;
    missed_circles?: number;
    accuracy?: number;
    decoy_hits?: number;
    fast_hits?: number;
    average_reaction_time?: number;
    adaptive_level?: number;

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
    last_played_at?: string;
}

export interface ReactionLeaderboard {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    is_premium: boolean;
    best_reaction_time: number;
    reaction_games: number;
    best_reaction_score: number;
    last_played_at?: string;
}

export interface SurvivalLeaderboard {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    is_premium: boolean;
    best_survival_time: number;
    max_level: number;
    best_streak: number;
    survival_games: number;
    last_played_at?: string;
}

// Enhanced user service with new game modes support
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

    async updateGameStats(
        telegramId: number,
        gameResult: ReactionGameResult | SurvivalGameResult,
    ): Promise<void> {
        const user = await this.findByTelegramId(telegramId);

        if (!user) throw new Error("User not found");

        const updates: any = {
            total_games: user.total_games + 1,
            total_score: user.total_score + gameResult.score,
            best_score: Math.max(user.best_score, gameResult.score),
            last_played_at: new Date().toISOString(),
        };

        if (gameResult.mode === GameMode.REACTION) {
            const reactionResult = gameResult as ReactionGameResult;

            updates.reaction_games = user.reaction_games + 1;
            updates.reaction_best_score = Math.max(
                user.reaction_best_score || 0,
                reactionResult.score,
            );

            // FIXED: Only update reaction time stats for successful (non-missed) attempts
            if (!reactionResult.missed && reactionResult.reactionTime > 0) {
                updates.reaction_best_time =
                    user.reaction_best_time > 0
                        ? Math.min(user.reaction_best_time, reactionResult.reactionTime)
                        : reactionResult.reactionTime;

                // Calculate new average reaction time only for successful attempts
                const totalReactionGames = user.reaction_games;
                const currentAverage = user.reaction_average_time || 0;
                const newAverage =
                    totalReactionGames > 0
                        ? (currentAverage * totalReactionGames +
                            reactionResult.reactionTime) /
                        (totalReactionGames + 1)
                        : reactionResult.reactionTime;

                updates.reaction_average_time = Math.round(newAverage);
            }
        } else if (gameResult.mode === GameMode.SURVIVAL) {
            const survivalResult = gameResult as SurvivalGameResult;

            updates.survival_games = user.survival_games + 1;
            updates.survival_best_score = Math.max(
                user.survival_best_score || 0,
                survivalResult.score,
            );
            updates.survival_best_time = Math.max(
                user.survival_best_time || 0,
                survivalResult.survivalTime,
            );
            updates.survival_max_level = Math.max(
                user.survival_max_level || 0,
                survivalResult.maxLevelReached,
            );
            updates.survival_best_streak = Math.max(
                user.survival_best_streak || 0,
                survivalResult.perfectStreak,
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

    async saveGameResult(
        telegramId: number,
        gameResult: ReactionGameResult | SurvivalGameResult,
    ): Promise<void> {
        const user = await this.findByTelegramId(telegramId);

        if (!user) throw new Error("User not found");

        const resultData: any = {
            user_id: user.id,
            game_mode: gameResult.mode,
            score: gameResult.score,
            duration: gameResult.duration,
        };

        if (gameResult.mode === GameMode.REACTION) {
            const reactionResult = gameResult as ReactionGameResult;

            // FIXED: Only set reaction_time if it's a successful attempt (not missed and > 0)
            if (!reactionResult.missed && reactionResult.reactionTime > 0) {
                resultData.reaction_time = reactionResult.reactionTime;
            }
            // For missed attempts, don't set reaction_time field at all (let it be null)

            resultData.reaction_rating = reactionResult.rating;
            resultData.missed_target = reactionResult.missed;
        } else if (gameResult.mode === GameMode.SURVIVAL) {
            const survivalResult = gameResult as SurvivalGameResult;

            resultData.survival_time = survivalResult.survivalTime;
            resultData.max_level_reached = survivalResult.maxLevelReached;
            resultData.perfect_streak = survivalResult.perfectStreak;
            resultData.correct_hits = survivalResult.correctHits;
            resultData.death_cause = survivalResult.deathCause;
        }

        console.log("Saving game result with data:", resultData);

        const { error } = await supabase.from("game_results").insert(resultData);

        if (error) {
            console.error("Error saving game result:", error);
            throw error;
        }

        await this.updateGameStats(telegramId, gameResult);
    },

    async getGameHistory(
        telegramId: number,
        limit: number = 50,
    ): Promise<GameResultDB[]> {
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
            .select(
                `
                id,
                telegram_id,
                first_name,
                last_name,
                username,
                is_premium,
                best_score,
                total_games,
                last_played_at
            `,
            )
            .gt("total_games", 0)
            .order("best_score", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching leaderboard:", error);
            throw error;
        }

        return data || [];
    },

    async getReactionLeaderboard(
        limit: number = 100,
    ): Promise<ReactionLeaderboard[]> {
        const { data, error } = await supabase
            .from("users")
            .select(
                `
                id,
                telegram_id,
                first_name,
                last_name,
                username,
                is_premium,
                reaction_best_time,
                reaction_games,
                reaction_best_score,
                last_played_at
            `,
            )
            .gt("reaction_games", 0)
            .gt("reaction_best_time", 0)
            .order("reaction_best_time", { ascending: true })
            .order("reaction_best_score", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching reaction leaderboard:", error);
            throw error;
        }

        return (data || []).map((user: any) => ({
            ...user,
            best_reaction_time: user.reaction_best_time,
            reaction_games: user.reaction_games,
            best_reaction_score: user.reaction_best_score,
        }));
    },

    async getSurvivalLeaderboard(
        limit: number = 100,
    ): Promise<SurvivalLeaderboard[]> {
        const { data, error } = await supabase
            .from("users")
            .select(
                `
                id,
                telegram_id,
                first_name,
                last_name,
                username,
                is_premium,
                survival_best_time,
                survival_max_level,
                survival_best_streak,
                survival_games,
                last_played_at
            `,
            )
            .gt("survival_games", 0)
            .order("survival_best_time", { ascending: false })
            .order("survival_max_level", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching survival leaderboard:", error);
            throw error;
        }

        return (data || []).map((user: any) => ({
            ...user,
            best_survival_time: user.survival_best_time,
            max_level: user.survival_max_level,
            best_streak: user.survival_best_streak,
            survival_games: user.survival_games,
        }));
    },

    async getUserRanking(telegramId: number): Promise<number | null> {
        const user = await this.findByTelegramId(telegramId);

        if (!user || user.total_games === 0) return null;

        const { count, error } = await supabase
            .from("users")
            .select("id", { count: "exact" })
            .gt("total_games", 0)
            .gt("best_score", user.best_score);

        if (error) {
            console.error("Error fetching user ranking:", error);
            throw error;
        }

        return (count || 0) + 1;
    },

    async getUserReactionRanking(telegramId: number): Promise<number | null> {
        const user = await this.findByTelegramId(telegramId);

        if (!user || user.reaction_games === 0 || !user.reaction_best_time)
            return null;

        const { count, error } = await supabase
            .from("users")
            .select("id", { count: "exact" })
            .gt("reaction_games", 0)
            .gt("reaction_best_time", 0)
            .lt("reaction_best_time", user.reaction_best_time);

        if (error) {
            console.error("Error fetching user reaction ranking:", error);
            throw error;
        }

        return (count || 0) + 1;
    },

    async getUserSurvivalRanking(telegramId: number): Promise<number | null> {
        const user = await this.findByTelegramId(telegramId);

        if (!user || user.survival_games === 0) return null;

        const { count, error } = await supabase
            .from("users")
            .select("id", { count: "exact" })
            .gt("survival_games", 0)
            .or(
                `survival_best_time.gt.${user.survival_best_time},and(survival_best_time.eq.${user.survival_best_time},survival_max_level.gt.${user.survival_max_level})`,
            );

        if (error) {
            console.error("Error fetching user survival ranking:", error);
            throw error;
        }

        return (count || 0) + 1;
    },
};