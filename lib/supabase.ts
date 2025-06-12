// src/lib/supabase.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Типы для базы данных
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

    // Статистика игры
    total_games: number;
    total_score: number;
    best_score: number;
    total_correct_hits: number;
    total_wrong_hits: number;
    total_missed_circles: number;
    best_accuracy: number;

    // Статистика по уровням сложности
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

    // Новые расширенные метрики
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
    // Новые поля для расширенной статистики
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

// Функции для работы с пользователями
export const userService = {
    // Поиск пользователя по Telegram ID
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

    // Создание нового пользователя
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

    // Обновление статистики пользователя после игры
    async updateGameStats(telegramId: number, gameResult: any): Promise<void> {
        const user = await this.findByTelegramId(telegramId);

        if (!user) throw new Error("User not found");

        const difficultyField = `${gameResult.difficulty}_games`;
        const difficultyBestField = `${gameResult.difficulty}_best_score`;

        // Подготовка базовых обновлений
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

        // Добавление новых расширенных метрик
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

    // Сохранение результата игры
    async saveGameResult(telegramId: number, gameResult: any): Promise<void> {
        const user = await this.findByTelegramId(telegramId);

        if (!user) throw new Error("User not found");

        // Базовые поля, которые точно есть в БД
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

        // Добавляем дополнительные поля только если они определены
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

        console.log('Saving game result with data:', resultData);

        const { error } = await supabase.from("game_results").insert(resultData);

        if (error) {
            console.error("Error saving game result:", error);
            throw error;
        }

        // Обновляем статистику пользователя
        await this.updateGameStats(telegramId, gameResult);
    },

    // Получение истории игр пользователя
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

    // Получение общего лидерборда по лучшему счету
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

    // Получение лидерборда по конкретной сложности
    async getDifficultyLeaderboard(
        difficulty: string,
        limit: number = 100
    ): Promise<DifficultyLeaderboard[]> {
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

    // Получение позиции пользователя в общем рейтинге
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

    // Получение позиции пользователя в рейтинге по сложности
    async getUserDifficultyRanking(
        telegramId: number,
        difficulty: string
    ): Promise<number | null> {
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
};