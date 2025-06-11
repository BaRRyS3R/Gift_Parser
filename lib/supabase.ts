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

// Функции для работы с пользователями
export const userService = {
  // Поиск пользователя по Telegram ID
  async findByTelegramId(telegramId: number): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegramId)
      .single();

    if (error && error.code !== "PGRST116") {
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

    const updates = {
      total_games: user.total_games + 1,
      total_score: user.total_score + gameResult.score,
      best_score: Math.max(user.best_score, gameResult.score),
      total_correct_hits: user.total_correct_hits + gameResult.correctHits,
      total_wrong_hits: user.total_wrong_hits + gameResult.wrongHits,
      total_missed_circles:
        user.total_missed_circles + gameResult.missedCircles,
      best_accuracy: Math.max(user.best_accuracy, gameResult.accuracy),
      [difficultyField]: (user as any)[difficultyField] + 1,
      [difficultyBestField]: Math.max(
        (user as any)[difficultyBestField],
        gameResult.score,
      ),
      last_played_at: new Date().toISOString(),
    };

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

    const resultData = {
      user_id: user.id,
      difficulty: gameResult.difficulty,
      score: gameResult.score,
      correct_hits: gameResult.correctHits,
      wrong_hits: gameResult.wrongHits,
      missed_circles: gameResult.missedCircles,
      accuracy: gameResult.accuracy,
      duration: gameResult.duration,
    };

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
};
