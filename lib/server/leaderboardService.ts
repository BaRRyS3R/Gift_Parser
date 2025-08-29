// src/lib/server/leaderboardService.ts - ПОЛНЫЙ ИСПРАВЛЕННЫЙ КОД (БЕЗ UUID для клиента)

import { supabaseServer } from "@/lib/supabase_server";

// ✅ БЕЗОПАСНЫЕ интерфейсы для отправки на клиент (БЕЗ id и telegram_id)
export interface SafeReactionLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  best_reaction_time: number;
  reaction_games: number;
  best_reaction_score: number;
  isCurrentUser?: boolean;
  // ❌ НЕ ВКЛЮЧАЕМ: id, telegram_id и другие чувствительные поля
}

export interface SafeSurvivalLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  best_survival_score: number;
  best_survival_time: number;
  max_level: number;
  best_streak: number;
  survival_games: number;
  isCurrentUser?: boolean;
  // ❌ НЕ ВКЛЮЧАЕМ: id, telegram_id
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
  // ❌ НЕ ВКЛЮЧАЕМ: id, telegram_id
}

export interface SafeRotationLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  best_rotation_score: number;
  best_rotation_time: number;
  max_level: number;
  best_streak: number;
  total_hits: number;
  rotation_games: number;
  isCurrentUser?: boolean;
  // ❌ НЕ ВКЛЮЧАЕМ: id, telegram_id
}

export interface SafeSeasonLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  total_score: number;
  total_games: number;
  isCurrentUser?: boolean;
  // ❌ НЕ ВКЛЮЧАЕМ: id, telegram_id
}

export interface UserRankings {
  season?: number;
  reaction?: number;
  survival?: number;
  physics?: number;
  rotation?: number;
}

// ✅ БЕЗОПАСНЫЙ ответ для клиента (все интерфейсы без UUID)
export interface AllLeaderboardsResponse {
  season: SafeSeasonLeaderboard[];
  reaction: SafeReactionLeaderboard[];
  survival: SafeSurvivalLeaderboard[];
  physics: SafePhysicsLeaderboard[];
  rotation: SafeRotationLeaderboard[];
  userRankings: UserRankings;
}

// 🔒 ВНУТРЕННИЙ интерфейс для работы с БД (ТОЛЬКО на сервере)
interface InternalUserData {
  id: string; // UUID - ТОЛЬКО для внутреннего использования
  telegram_id: number; // Также чувствительные данные
  first_name: string;
  last_name?: string;
  username?: string;
  total_score: number;
  total_games: number;
  reaction_best_time: number;
  reaction_games: number;
  reaction_best_score: number;
  survival_best_time: number;
  survival_best_score: number;
  survival_max_level: number;
  survival_best_streak: number;
  survival_games: number;
  physics_best_score: number;
  physics_best_time: number;
  physics_best_hits: number;
  physics_least_mistakes: number;
  physics_games: number;
  rotation_best_score: number;
  rotation_best_time: number;
  rotation_max_level: number;
  rotation_best_streak: number;
  rotation_total_hits: number;
  rotation_games: number;
}

export const serverLeaderboardService = {
  /**
   * ✅ ОПТИМИЗИРОВАННЫЙ метод: получение всех лидербордов одним запросом
   * UUID используется ТОЛЬКО для внутренней логики, НЕ передается на клиент
   */
  async getAllLeaderboards(
    currentUserId: string, // 🔒 UUID остается ТОЛЬКО на сервере
    telegramId: number,
    limit: number = 100,
  ): Promise<AllLeaderboardsResponse> {
    try {
      // Единый запрос к базе данных для получения всех пользователей
      const { data: allUsers, error } = await supabaseServer
        .from("users")
        .select(
          `
          id,
          telegram_id,
          first_name,
          last_name,
          username,
          total_score,
          total_games,
          reaction_best_time,
          reaction_games,
          reaction_best_score,
          survival_best_time,
          survival_best_score,
          survival_max_level,
          survival_best_streak,
          survival_games,
          physics_best_score,
          physics_best_time,
          physics_best_hits,
          physics_least_mistakes,
          physics_games,
          rotation_best_score,
          rotation_best_time,
          rotation_max_level,
          rotation_best_streak,
          rotation_total_hits,
          rotation_games
        `,
        )
        .or(
          "total_games.gt.0,reaction_games.gt.0,survival_games.gt.0,physics_games.gt.0,rotation_games.gt.0",
        );

      if (error) {
        console.error("Error fetching users data:", error);
        throw new Error("Failed to fetch users data");
      }

      const users: InternalUserData[] = allUsers || [];

      // Обрабатываем все лидерборды в памяти (БЕЗ передачи UUID на клиент)
      const season = this.processSeasonLeaderboard(users, currentUserId, limit);
      const reaction = this.processReactionLeaderboard(users, currentUserId, limit);
      const survival = this.processSurvivalLeaderboard(users, currentUserId, limit);
      const physics = this.processPhysicsLeaderboard(users, currentUserId, limit);
      const rotation = this.processRotationLeaderboard(users, currentUserId, limit);
      const userRankings = this.calculateUserRankings(users, telegramId);

      return {
        season,
        reaction,
        survival,
        physics,
        rotation,
        userRankings,
      };
    } catch (error) {
      console.error("Error fetching all leaderboards:", error);
      throw new Error("Failed to fetch leaderboards");
    }
  },

  /**
   * ✅ Обработка season лидерборда (БЕЗ UUID в ответе)
   */
  processSeasonLeaderboard(
    allUsers: InternalUserData[],
    currentUserId: string, // 🔒 UUID для внутреннего сравнения
    limit: number = 100,
  ): SafeSeasonLeaderboard[] {
    const filtered = allUsers
      .filter((user) => user.total_games > 0)
      .sort((a, b) => {
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score;
        }
        return b.total_games - a.total_games;
      })
      .slice(0, limit);

    return filtered.map((user, index) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      total_score: user.total_score,
      total_games: user.total_games,
      isCurrentUser: user.id === currentUserId, // 🔒 UUID остается на сервере
      // ❌ НЕ ВКЛЮЧАЕМ: id, telegram_id
    }));
  },

  /**
   * ✅ Обработка reaction лидерборда (БЕЗ UUID в ответе)
   */
  processReactionLeaderboard(
    allUsers: InternalUserData[],
    currentUserId: string,
    limit: number = 100,
  ): SafeReactionLeaderboard[] {
    const filtered = allUsers
      .filter((user) => user.reaction_games > 0 && user.reaction_best_time > 0)
      .sort((a, b) => {
        if (a.reaction_best_time !== b.reaction_best_time) {
          return a.reaction_best_time - b.reaction_best_time;
        }
        return b.reaction_best_score - a.reaction_best_score;
      })
      .slice(0, limit);

    return filtered.map((user, index) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_reaction_time: user.reaction_best_time,
      reaction_games: user.reaction_games,
      best_reaction_score: user.reaction_best_score,
      isCurrentUser: user.id === currentUserId, // 🔒 UUID остается на сервере
      // ❌ НЕ ВКЛЮЧАЕМ: id, telegram_id
    }));
  },

  /**
   * ✅ Обработка survival лидерборда (БЕЗ UUID в ответе)
   */
  processSurvivalLeaderboard(
    allUsers: InternalUserData[],
    currentUserId: string,
    limit: number = 100,
  ): SafeSurvivalLeaderboard[] {
    const filtered = allUsers
      .filter((user) => user.survival_games > 0)
      .sort((a, b) => {
        if (b.survival_best_score !== a.survival_best_score) {
          return b.survival_best_score - a.survival_best_score;
        }
        if (b.survival_best_time !== a.survival_best_time) {
          return b.survival_best_time - a.survival_best_time;
        }
        return b.survival_max_level - a.survival_max_level;
      })
      .slice(0, limit);

    return filtered.map((user, index) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_survival_score: user.survival_best_score,
      best_survival_time: user.survival_best_time,
      max_level: user.survival_max_level,
      best_streak: user.survival_best_streak,
      survival_games: user.survival_games,
      isCurrentUser: user.id === currentUserId, // 🔒 UUID остается на сервере
      // ❌ НЕ ВКЛЮЧАЕМ: id, telegram_id
    }));
  },

  /**
   * ✅ Обработка physics лидерборда (БЕЗ UUID в ответе)
   */
  processPhysicsLeaderboard(
    allUsers: InternalUserData[],
    currentUserId: string,
    limit: number = 100,
  ): SafePhysicsLeaderboard[] {
    const filtered = allUsers
      .filter((user) => user.physics_games > 0)
      .sort((a, b) => {
        if (b.physics_best_score !== a.physics_best_score) {
          return b.physics_best_score - a.physics_best_score;
        }
        if (b.physics_best_time !== a.physics_best_time) {
          return b.physics_best_time - a.physics_best_time;
        }
        return b.physics_best_hits - a.physics_best_hits;
      })
      .slice(0, limit);

    return filtered.map((user, index) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_physics_score: user.physics_best_score,
      best_physics_time: user.physics_best_time,
      best_hits: user.physics_best_hits,
      least_mistakes: user.physics_least_mistakes,
      physics_games: user.physics_games,
      isCurrentUser: user.id === currentUserId, // 🔒 UUID остается на сервере
      // ❌ НЕ ВКЛЮЧАЕМ: id, telegram_id
    }));
  },

  /**
   * ✅ Обработка rotation лидерборда (БЕЗ UUID в ответе)
   */
  processRotationLeaderboard(
    allUsers: InternalUserData[],
    currentUserId: string,
    limit: number = 100,
  ): SafeRotationLeaderboard[] {
    const filtered = allUsers
      .filter((user) => user.rotation_games > 0)
      .sort((a, b) => {
        if (b.rotation_best_score !== a.rotation_best_score) {
          return b.rotation_best_score - a.rotation_best_score;
        }
        if (b.rotation_best_time !== a.rotation_best_time) {
          return b.rotation_best_time - a.rotation_best_time;
        }
        return b.rotation_max_level - a.rotation_max_level;
      })
      .slice(0, limit);

    return filtered.map((user, index) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_rotation_score: user.rotation_best_score,
      best_rotation_time: user.rotation_best_time,
      max_level: user.rotation_max_level,
      best_streak: user.rotation_best_streak,
      total_hits: user.rotation_total_hits,
      rotation_games: user.rotation_games,
      isCurrentUser: user.id === currentUserId, // 🔒 UUID остается на сервере
      // ❌ НЕ ВКЛЮЧАЕМ: id, telegram_id
    }));
  },

  /**
   * ✅ Вычисление персональных рейтингов пользователя (используем telegram_id)
   */
  calculateUserRankings(allUsers: InternalUserData[], telegramId: number): UserRankings {
    const user = allUsers.find((u) => u.telegram_id === telegramId); // ✅ Ищем по telegram_id

    if (!user) {
      return {};
    }

    const rankings: UserRankings = {};

    // Season ranking
    if (user.total_games > 0) {
      const betterUsers = allUsers.filter(
        (u) =>
          u.total_games > 0 &&
          (u.total_score > user.total_score ||
            (u.total_score === user.total_score &&
              u.total_games > user.total_games)),
      );
      rankings.season = betterUsers.length + 1;
    }

    // Reaction ranking
    if (user.reaction_games > 0 && user.reaction_best_time > 0) {
      const betterUsers = allUsers.filter(
        (u) =>
          u.reaction_games > 0 &&
          u.reaction_best_time > 0 &&
          (u.reaction_best_time < user.reaction_best_time ||
            (u.reaction_best_time === user.reaction_best_time &&
              u.reaction_best_score > user.reaction_best_score)),
      );
      rankings.reaction = betterUsers.length + 1;
    }

    // Survival ranking
    if (user.survival_games > 0) {
      const betterUsers = allUsers.filter(
        (u) =>
          u.survival_games > 0 &&
          (u.survival_best_score > user.survival_best_score ||
            (u.survival_best_score === user.survival_best_score &&
              u.survival_best_time > user.survival_best_time)),
      );
      rankings.survival = betterUsers.length + 1;
    }

    // Physics ranking
    if (user.physics_games > 0) {
      const betterUsers = allUsers.filter(
        (u) =>
          u.physics_games > 0 &&
          (u.physics_best_score > user.physics_best_score ||
            (u.physics_best_score === user.physics_best_score &&
              u.physics_best_time > user.physics_best_time)),
      );
      rankings.physics = betterUsers.length + 1;
    }

    // Rotation ranking
    if (user.rotation_games > 0) {
      const betterUsers = allUsers.filter(
        (u) =>
          u.rotation_games > 0 &&
          (u.rotation_best_score > user.rotation_best_score ||
            (u.rotation_best_score === user.rotation_best_score &&
              u.rotation_best_time > user.rotation_best_time)),
      );
      rankings.rotation = betterUsers.length + 1;
    }

    return rankings;
  },

  // ============================================================================
  // ✅ LEGACY МЕТОДЫ для обратной совместимости (также БЕЗ UUID в ответах)
  // ============================================================================

  /**
   * LEGACY: Season leaderboard (БЕЗ UUID в ответе)
   */
  async getSeasonLeaderboard(
    currentUserId: string,
    limit: number = 100,
  ): Promise<SafeSeasonLeaderboard[]> {
    const { data, error } = await supabaseServer
      .from("users")
      .select(
        `
        id,
        first_name,
        last_name,
        username,
        total_score,
        total_games
      `,
      )
      .gt("total_games", 0)
      .order("total_score", { ascending: false })
      .order("total_games", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching season leaderboard:", error);
      throw new Error("Failed to fetch season leaderboard");
    }

    return (data || []).map((user: any, index: number) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      total_score: user.total_score,
      total_games: user.total_games,
      isCurrentUser: user.id === currentUserId,
      // ❌ НЕ ВКЛЮЧАЕМ: id в финальный ответ
    }));
  },

  /**
   * LEGACY: Reaction leaderboard (БЕЗ UUID в ответе)
   */
  async getReactionLeaderboard(
    currentUserId: string,
    limit: number = 100,
  ): Promise<SafeReactionLeaderboard[]> {
    const { data, error } = await supabaseServer
      .from("users")
      .select(
        `
        id,
        first_name,
        last_name,
        username,
        reaction_best_time,
        reaction_games,
        reaction_best_score
      `,
      )
      .gt("reaction_games", 0)
      .gt("reaction_best_time", 0)
      .order("reaction_best_time", { ascending: true })
      .order("reaction_best_score", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching reaction leaderboard:", error);
      throw new Error("Failed to fetch reaction leaderboard");
    }

    return (data || []).map((user: any, index: number) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_reaction_time: user.reaction_best_time,
      reaction_games: user.reaction_games,
      best_reaction_score: user.reaction_best_score,
      isCurrentUser: user.id === currentUserId,
      // ❌ НЕ ВКЛЮЧАЕМ: id в финальный ответ
    }));
  },

  /**
   * LEGACY: Survival leaderboard (БЕЗ UUID в ответе)
   */
  async getSurvivalLeaderboard(
    currentUserId: string,
    limit: number = 100,
  ): Promise<SafeSurvivalLeaderboard[]> {
    const { data, error } = await supabaseServer
      .from("users")
      .select(
        `
        id,
        first_name,
        last_name,
        username,
        survival_best_time,
        survival_best_score,
        survival_max_level,
        survival_best_streak,
        survival_games
      `,
      )
      .gt("survival_games", 0)
      .order("survival_best_score", { ascending: false })
      .order("survival_best_time", { ascending: false })
      .order("survival_max_level", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching survival leaderboard:", error);
      throw new Error("Failed to fetch survival leaderboard");
    }

    return (data || []).map((user: any, index: number) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_survival_score: user.survival_best_score,
      best_survival_time: user.survival_best_time,
      max_level: user.survival_max_level,
      best_streak: user.survival_best_streak,
      survival_games: user.survival_games,
      isCurrentUser: user.id === currentUserId,
      // ❌ НЕ ВКЛЮЧАЕМ: id в финальный ответ
    }));
  },

  /**
   * LEGACY: Physics leaderboard (БЕЗ UUID в ответе)
   */
  async getPhysicsLeaderboard(
    currentUserId: string,
    limit: number = 100,
  ): Promise<SafePhysicsLeaderboard[]> {
    const { data, error } = await supabaseServer
      .from("users")
      .select(
        `
        id,
        first_name,
        last_name,
        username,
        physics_best_score,
        physics_best_time,
        physics_best_hits,
        physics_least_mistakes,
        physics_games
      `,
      )
      .gt("physics_games", 0)
      .order("physics_best_score", { ascending: false })
      .order("physics_best_time", { ascending: false })
      .order("physics_best_hits", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching physics leaderboard:", error);
      throw new Error("Failed to fetch physics leaderboard");
    }

    return (data || []).map((user: any, index: number) => ({
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
      // ❌ НЕ ВКЛЮЧАЕМ: id в финальный ответ
    }));
  },

  /**
   * LEGACY: Rotation leaderboard (БЕЗ UUID в ответе)
   */
  async getRotationLeaderboard(
    currentUserId: string,
    limit: number = 100,
  ): Promise<SafeRotationLeaderboard[]> {
    const { data, error } = await supabaseServer
      .from("users")
      .select(
        `
        id,
        first_name,
        last_name,
        username,
        rotation_best_score,
        rotation_best_time,
        rotation_max_level,
        rotation_best_streak,
        rotation_total_hits,
        rotation_games
      `,
      )
      .gt("rotation_games", 0)
      .order("rotation_best_score", { ascending: false })
      .order("rotation_best_time", { ascending: false })
      .order("rotation_max_level", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching rotation leaderboard:", error);
      throw new Error("Failed to fetch rotation leaderboard");
    }

    return (data || []).map((user: any, index: number) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_rotation_score: user.rotation_best_score,
      best_rotation_time: user.rotation_best_time,
      max_level: user.rotation_max_level,
      best_streak: user.rotation_best_streak,
      total_hits: user.rotation_total_hits,
      rotation_games: user.rotation_games,
      isCurrentUser: user.id === currentUserId,
      // ❌ НЕ ВКЛЮЧАЕМ: id в финальный ответ
    }));
  },

  /**
   * LEGACY: Получение персональных рейтингов пользователя
   * Этот метод используется только для обратной совместимости
   */
  async getUserRankings(telegramId: number): Promise<UserRankings> {
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("*")
      .eq("telegram_id", telegramId) // ✅ Используем telegram_id вместо UUID
      .single();

    if (userError || !user) {
      throw new Error("User not found");
    }

    const rankings: UserRankings = {};

    // Season ranking
    if (user.total_games > 0) {
      const { count, error: seasonError } = await supabaseServer
        .from("users")
        .select("id", { count: "exact" })
        .gt("total_games", 0)
        .or(`total_score.gt.${user.total_score},and(total_score.eq.${user.total_score},total_games.gt.${user.total_games})`);

      if (!seasonError) {
        rankings.season = (count || 0) + 1;
      }
    }

    // Reaction ranking
    if (user.reaction_games > 0 && user.reaction_best_time > 0) {
      const { count, error: reactionError } = await supabaseServer
        .from("users")
        .select("id", { count: "exact" })
        .gt("reaction_games", 0)
        .gt("reaction_best_time", 0)
        .or(`reaction_best_time.lt.${user.reaction_best_time},and(reaction_best_time.eq.${user.reaction_best_time},reaction_best_score.gt.${user.reaction_best_score})`);

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
        .or(`survival_best_score.gt.${user.survival_best_score},and(survival_best_score.eq.${user.survival_best_score},survival_best_time.gt.${user.survival_best_time})`);

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
        .or(`rotation_best_score.gt.${user.rotation_best_score},and(rotation_best_score.eq.${user.rotation_best_score},rotation_best_time.gt.${user.rotation_best_time})`);

      if (!rotationError) {
        rankings.rotation = (count || 0) + 1;
      }
    }

    return rankings;
  },
};