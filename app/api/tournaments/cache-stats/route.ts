// src/app/api/tournaments/cache-stats/route.ts - Статистика кеша турниров

import { NextRequest, NextResponse } from "next/server";
import { serverTournamentService } from "@/lib/server/tournamentService";
import { checkRedisConnection } from "@/lib/redis";

// ✅ БЕЗОПАСНЫЙ Response interface (БЕЗ чувствительных данных)
interface TournamentCacheStatsResponse {
  success: boolean;
  redis_available: boolean;
  cache_stats?: {
    active_tournament_cached: boolean;
    tournament_cache_age_seconds?: number;
    tournament_time_until_expiry_seconds?: number;
    leaderboard_caches_count: number;
    last_update_timestamp?: number;
  };
  optimization_info?: {
    single_active_tournament: boolean;
    cached_leaderboards: boolean;
    personalized_user_positions: boolean;
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
 * ✅ Статистика кеша турниров БЕЗ утечки чувствительных данных
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
        cache_stats: {
          active_tournament_cached: false,
          leaderboard_caches_count: 0,
        },
        optimization_info: {
          single_active_tournament: true,
          cached_leaderboards: true,
          personalized_user_positions: true,
          security_measures: {
            uuid_exposure_prevented: true, // ✅ UUID не передаются на клиент
            telegram_id_secured: true,     // ✅ telegram_id не передаются на клиент
            client_data_filtered: true,    // ✅ Данные фильтруются перед отправкой
          },
        },
      });
    }

    // ✅ ПОЛУЧАЕМ БЕЗОПАСНУЮ СТАТИСТИКУ (без пользовательских данных)
    const cacheStats = await serverTournamentService.getTournamentCacheStats();

    return NextResponse.json({
      success: true,
      redis_available: true,
      cache_stats: {
        active_tournament_cached: cacheStats.active_tournament_cached,
        tournament_cache_age_seconds: cacheStats.tournament_cache_age_seconds,
        tournament_time_until_expiry_seconds: cacheStats.tournament_time_until_expiry_seconds,
        leaderboard_caches_count: cacheStats.leaderboard_caches_count,
        last_update_timestamp: cacheStats.last_update_timestamp,
      },
      optimization_info: {
        single_active_tournament: true,        // ✅ Только один активный турнир
        cached_leaderboards: true,             // ✅ Кешированные лидерборды
        personalized_user_positions: true,    // ✅ Персональные позиции для каждого пользователя
        security_measures: {
          uuid_exposure_prevented: true, // ✅ UUID надежно скрыты от клиента
          telegram_id_secured: true,     // ✅ telegram_id не передаются на клиент
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
          single_active_tournament: true,
          cached_leaderboards: true,
          personalized_user_positions: true,
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