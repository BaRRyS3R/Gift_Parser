// src/lib/supabase.ts

import { createClient } from "@supabase/supabase-js";
import { GameMode, SkillLevel } from "@/types/game";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Расширенные типы для базы данных
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

    // Базовая статистика игры
    total_games: number;
    total_score: number;
    best_score: number;
    total_correct_hits: number;
    total_wrong_hits: number;
    total_missed_circles: number;
    best_accuracy: number;

    // Статистика по обычным уровням сложности
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

    // Статистика по новым режимам
    reverse_easy_games: number;
    reverse_easy_best_score: number;
    reverse_medium_games: number;
    reverse_medium_best_score: number;
    reverse_hard_games: number;
    reverse_hard_best_score: number;
    chaos_reverse_games: number;
    chaos_reverse_best_score: number;

    precision_easy_games: number;
    precision_easy_best_score: number;
    precision_medium_games: number;
    precision_medium_best_score: number;
    precision_hard_games: number;
    precision_hard_best_score: number;
    ultimate_precision_games: number;
    ultimate_precision_best_score: number;

    // Расширенные метрики
    total_decoy_hits?: number;
    total_fast_hits?: number;
    best_reaction_time?: number;
    max_adaptive_level?: number;
    total_perfect_runs?: number;
    longest_overall_streak?: number;
    total_multitouch_events?: number;
    best_efficiency_rating?: number;
    highest_skill_level?: SkillLevel;

    // Статистика по режимам
    normal_mode_games: number;
    reverse_mode_games: number;
    precision_mode_games: number;
    total_precision_failures: number;
    best_survival_time?: number;

    last_played_at?: string;
    is_active: boolean;
}

export interface GameResultDB {
    id: string; // UUID v4
    user_id: string; // UUID v4
    difficulty: string;
    game_mode: GameMode;
    score: number;
    correct_hits: number;
    wrong_hits: number;
    missed_circles: number;
    accuracy: number;
    duration: number;

    // Расширенные поля результата
    decoy_hits?: number;
    fast_hits?: number;
    average_reaction_time?: number;
    adaptive_level?: number;
    perfect_runs?: number;
    longest_streak?: number;
    speed_bonus_total?: number;
    multitouch_events?: number;
    precision_misses?: number;
    survival_time?: number;
    efficiency_rating?: number;
    skill_level?: SkillLevel;

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
    best_efficiency_rating?: number;
    highest_skill_level?: SkillLevel;
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

export interface ModeLeaderboard {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    is_premium: boolean;
    mode_games: number;
    mode_best_score: number;
    mode_best_efficiency?: number;
    mode_best_survival?: number;
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
        const modeField = `${gameResult.gameMode}_mode_games`;

        // Подготовка базовых обновлений
        const updates: any = {
            total_games: user.total_games + 1,
            total_score: user.total_score + gameResult.score,
            best_score: Math.max(user.best_score, gameResult.score),
            total_correct_hits: user.total_correct_hits + gameResult.correctHits,
            total_wrong_hits: user.total_wrong_hits + gameResult.wrongHits,
            total_missed_circles: user.total_missed_circles + gameResult.missedCircles,
            best_accuracy: Math.max(user.best_accuracy, gameResult.accuracy),
            last_played_at: new Date().toISOString(),
        };

        // Обновление статистики по сложности
        if ((user as any)[difficultyField] !== undefined) {
            updates[difficultyField] = (user as any)[difficultyField] + 1;
            updates[difficultyBestField] = Math.max(
                (user as any)[difficultyBestField],
                gameResult.score,
            );
        }

        // Обновление статистики по режимам
        const modeMapping = {
            [GameMode.NORMAL]: 'normal_mode_games',
            [GameMode.REVERSE]: 'reverse_mode_games',
            [GameMode.PRECISION]: 'precision_mode_games',
            [GameMode.REVERSE_PRECISION]: 'precision_mode_games' // Считаем как precision
        };

        const modeFieldName = modeMapping[gameResult.gameMode as GameMode];
        if (modeFieldName) {
            updates[modeFieldName] = (user as any)[modeFieldName] + 1;
        }

        // Обновление расширенных метрик
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

        if (gameResult.perfectRuns !== undefined) {
            updates.total_perfect_runs = (user.total_perfect_runs || 0) + gameResult.perfectRuns;
        }

        if (gameResult.longestStreak !== undefined) {
            updates.longest_overall_streak = Math.max(
                user.longest_overall_streak || 0,
                gameResult.longestStreak
            );
        }

        if (gameResult.multiTouchEvents !== undefined) {
            updates.total_multitouch_events = (user.total_multitouch_events || 0) + gameResult.multiTouchEvents;
        }

        if (gameResult.efficiencyRating !== undefined) {
            updates.best_efficiency_rating = Math.max(
                user.best_efficiency_rating || 0,
                gameResult.efficiencyRating
            );
        }

        if (gameResult.skillLevel !== undefined) {
            const skillLevelOrder = {
                [SkillLevel.BEGINNER]: 1,
                [SkillLevel.NOVICE]: 2,
                [SkillLevel.INTERMEDIATE]: 3,
                [SkillLevel.ADVANCED]: 4,
                [SkillLevel.EXPERT]: 5,
                [SkillLevel.MASTER]: 6,
                [SkillLevel.LEGENDARY]: 7
            };

            const currentLevel = skillLevelOrder[user.highest_skill_level as SkillLevel] || 0;
            const newLevel = skillLevelOrder[gameResult.skillLevel as SkillLevel] || 0;

            if (newLevel > currentLevel) {
                updates.highest_skill_level = gameResult.skillLevel;
            }
        }

        // Precision mode специфичные обновления
        if (gameResult.gameMode === GameMode.PRECISION || gameResult.gameMode === GameMode.REVERSE_PRECISION) {
            if (gameResult.precisionMisses > 0) {
                updates.total_precision_failures = (user.total_precision_failures || 0) + 1;
            }

            if (gameResult.survivalTime !== undefined) {
                updates.best_survival_time = Math.max(
                    user.best_survival_time || 0,
                    gameResult.survivalTime
                );
            }
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

        // Базовые поля результата
        const resultData: any = {
            user_id: user.id,
            difficulty: gameResult.difficulty,
            game_mode: gameResult.gameMode,
            score: gameResult.score,
            correct_hits: gameResult.correctHits,
            wrong_hits: gameResult.wrongHits,
            missed_circles: gameResult.missedCircles,
            accuracy: gameResult.accuracy,
            duration: gameResult.duration,
        };

        // Добавляем расширенные поля
        const extendedFields = [
            'decoyHits', 'fastHits', 'averageReactionTime', 'adaptiveLevel',
            'perfectRuns', 'longestStreak', 'speedBonusTotal', 'multiTouchEvents',
            'precisionMisses', 'survivalTime', 'efficiencyRating', 'skillLevel'
        ];

        extendedFields.forEach(field => {
            if (gameResult[field] !== undefined) {
                const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
                resultData[dbField] = gameResult[field];
            }
        });

        console.log('Saving extended game result:', resultData);

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

    // Получение общего лидерборда
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
                best_efficiency_rating,
                highest_skill_level,
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

    // Получение лидерборда по игровому режиму
    async getModeLeaderboard(
        mode: GameMode,
        limit: number = 100
    ): Promise<ModeLeaderboard[]> {
        const modeMapping = {
            [GameMode.NORMAL]: 'normal_mode_games',
            [GameMode.REVERSE]: 'reverse_mode_games',
            [GameMode.PRECISION]: 'precision_mode_games',
            [GameMode.REVERSE_PRECISION]: 'precision_mode_games'
        };

        const modeField = modeMapping[mode];
        if (!modeField) return [];

        // Для режимов получаем лучший результат из всех игр этого режима
        const { data, error } = await supabase
            .from("users")
            .select(`
                id,
                telegram_id,
                first_name,
                last_name,
                username,
                is_premium,
                ${modeField},
                best_score,
                best_efficiency_rating,
                best_survival_time,
                last_played_at
            `)
            .gt(modeField, 0)
            .order("best_score", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching mode leaderboard:", error);
            throw error;
        }

        return (data || []).map((user: any) => ({
            ...user,
            mode_games: user[modeField],
            mode_best_score: user.best_score,
            mode_best_efficiency: user.best_efficiency_rating,
            mode_best_survival: user.best_survival_time
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

    // Получение детальной аналитики пользователя
    async getUserAnalytics(telegramId: number): Promise<any> {
        const user = await this.findByTelegramId(telegramId);
        if (!user) return null;

        // Получаем последние 20 игр для анализа тенденций
        const recentGames = await this.getGameHistory(telegramId, 20);

        // Определяем типы для областей анализа
        interface AnalysisArea {
            name: string;
            rating: number;
            trend: 'improving' | 'stable' | 'declining';
            description: string;
        }

        // Анализ сильных и слабых сторон
        const analytics = {
            strengthAreas: [] as AnalysisArea[],
            weaknessAreas: [] as AnalysisArea[],
            skillProgression: [] as string[],
            consistencyRating: 0,
            adaptabilityRating: 0,
            recommendedModes: [] as string[]
        };

        // Анализ точности
        if (user.best_accuracy >= 90) {
            analytics.strengthAreas.push({
                name: 'Accuracy',
                rating: user.best_accuracy,
                trend: 'stable',
                description: 'Excellent precision in targeting'
            });
        } else if (user.best_accuracy < 70) {
            analytics.weaknessAreas.push({
                name: 'Accuracy',
                rating: user.best_accuracy,
                trend: 'improving',
                description: 'Focus on careful aiming'
            });
        }

        // Анализ скорости реакции
        if (user.best_reaction_time && user.best_reaction_time <= 200) {
            analytics.strengthAreas.push({
                name: 'Reaction Speed',
                rating: Math.max(0, 100 - (user.best_reaction_time / 5)),
                trend: 'stable',
                description: 'Lightning-fast reflexes'
            });
        }

        // Анализ постоянства результатов
        if (recentGames.length >= 5) {
            const scores = recentGames.map(g => g.score);
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            const variance = scores.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / scores.length;
            const standardDeviation = Math.sqrt(variance);
            analytics.consistencyRating = Math.max(0, 100 - (standardDeviation / avgScore * 100));
        }

        return analytics;
    }
};