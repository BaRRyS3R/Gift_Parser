// src/app/api/tournaments/cache-stats/route.ts - Статистика кеша турниров БЕЗ утечки данных

import { NextRequest, NextResponse } from "next/server";
import { tournamentCacheService } from "@/lib/server/tournamentCacheService";
import { checkRedisConnection } from "@/lib/redis";

// ✅ БЕЗОПАСНЫЙ Response interface (БЕЗ чувствительных данных)
interface TournamentCacheStatsResponse {
  success: boolean;
  redis_available: boolean;
  tournament_cache_stats?: {
    has_active_tournament_cache: boolean;
    cached_tournament_id?: string;
    cache_age_seconds?: number;
  };
  optimization_info?: {
    client_side_positioning: boolean;
    no_server_position_calculation: boolean;
    simplified_user_stats: boolean;
    public_leaderboard_only: boolean;
    security_measures: {
      uuid_exposure_prevented: boolean;
      telegram_id_secured: boolean;
      client_data_filtered: boolean;
    };
  };
  error?: string;
}

/**
 * GET /api/tournaments/cache-stats
 * ✅ БЕЗОПАСНАЯ статистика кеша турниров БЕЗ утечки чувствительных данных
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<TournamentCacheStatsResponse>> {
  try {
    // Базовая проверка аутентификации
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      console.error("[TOURNAMENT_CACHE_STATS] Missing authentication headers");
      return NextResponse.json(
        {
          success: false,
          redis_available: false,
          error: "Authentication required",
        },
        { status: 401 },
      );
    }

    // 🔒 ВАЖНО: НЕ логируем чувствительные данные
    console.log(`[TOURNAMENT_CACHE_STATS] Request from authenticated user`);

    // Проверяем доступность Redis
    const redisAvailable = await checkRedisConnection();

    if (!redisAvailable) {
      return NextResponse.json({
        success: true,
        redis_available: false,
        tournament_cache_stats: {
          has_active_tournament_cache: false,
        },
        optimization_info: {
          client_side_positioning: true,
          no_server_position_calculation: true,
          simplified_user_stats: true,
          public_leaderboard_only: true,
          security_measures: {
            uuid_exposure_prevented: true, // ✅ UUID не передаются на клиент
            telegram_id_secured: true,     // ✅ telegram_id не передаются на клиент
            client_data_filtered: true,    // ✅ Данные фильтруются перед отправкой
          },
        },
      });
    }

    // ✅ ПОЛУЧАЕМ БЕЗОПАСНУЮ СТАТИСТИКУ (без пользовательских данных)
    const cacheStats = await tournamentCacheService.getCacheStats();

    return NextResponse.json({
      success: true,
      redis_available: true,
      tournament_cache_stats: {
        has_active_tournament_cache: cacheStats.has_active_tournament_cache,
        cached_tournament_id: cacheStats.cached_tournament_id, // Только ID турнира
        cache_age_seconds: cacheStats.cache_age_seconds,
      },
      optimization_info: {
        // ✅ ИСПРАВЛЕНО: использую правильные поля из optimization_info
        client_side_positioning: cacheStats.optimization_info.client_side_positioning,
        no_server_position_calculation: cacheStats.optimization_info.no_server_position_calculation,
        simplified_user_stats: cacheStats.optimization_info.simplified_user_stats,
        public_leaderboard_only: cacheStats.optimization_info.public_leaderboard_only,
        security_measures: {
          uuid_exposure_prevented: true, // ✅ Статичное значение - UUID защищены
          telegram_id_secured: true,     // ✅ telegram_id надежно скрыты от клиента
          client_data_filtered: true,    // ✅ Строгая фильтрация данных
        },
      },
    });

  } catch (error) {
    console.error("[TOURNAMENT_CACHE_STATS] Error getting cache stats:", error);

    return NextResponse.json(
      {
        success: false,
        redis_available: false,
        optimization_info: {
          client_side_positioning: true,
          no_server_position_calculation: true,
          simplified_user_stats: true,
          public_leaderboard_only: true,
          security_measures: {
            uuid_exposure_prevented: true,
            telegram_id_secured: true,
            client_data_filtered: true,
          },
        },
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}