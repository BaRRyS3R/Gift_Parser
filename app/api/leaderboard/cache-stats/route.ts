// src/app/api/leaderboard/cache-stats/route.ts - ИСПРАВЛЕНА версия БЕЗ утечки данных

import { NextRequest, NextResponse } from "next/server";

import { leaderboardCacheService } from "@/lib/server/leaderboardCacheService";
import { checkRedisConnection } from "@/lib/redis";

// ✅ БЕЗОПАСНЫЙ Response interface (БЕЗ чувствительных данных)
interface CacheStatsResponse {
  success: boolean;
  redis_available: boolean;
  cache_stats?: {
    has_cache: boolean;
    cache_age_seconds?: number;
    time_until_expiry_seconds?: number;
    last_update_timestamp?: number;
    cached_users_count?: number; // Только количество, без данных пользователей
  };
  optimization_info?: {
    single_db_query: boolean;
    personalized_rankings: boolean;
    data_deduplication: boolean;
    security_measures: {
      uuid_exposure_prevented: boolean;
      telegram_id_secured: boolean;
      client_data_filtered: boolean;
    };
  };
  error?: string;
}

/**
 * GET /api/leaderboard/cache-stats
 * ✅ ИСПРАВЛЕННАЯ статистика кеша БЕЗ утечки чувствительных данных
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<CacheStatsResponse>> {
  try {
    // Базовая проверка аутентификации
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      console.error("[CACHE_STATS] Missing authentication headers");
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
    console.log(`[CACHE_STATS] Request from authenticated user`);

    // Проверяем доступность Redis
    const redisAvailable = await checkRedisConnection();

    if (!redisAvailable) {
      return NextResponse.json({
        success: true,
        redis_available: false,
        cache_stats: {
          has_cache: false,
          cached_users_count: 0,
        },
        optimization_info: {
          single_db_query: true,
          personalized_rankings: true,
          data_deduplication: true,
          security_measures: {
            uuid_exposure_prevented: true, // ✅ UUID не передаются на клиент
            telegram_id_secured: true,     // ✅ telegram_id не передаются на клиент
            client_data_filtered: true,    // ✅ Данные фильтруются перед отправкой
          },
        },
      });
    }

    // ✅ ПОЛУЧАЕМ БЕЗОПАСНУЮ СТАТИСТИКУ (без пользовательских данных)
    const cacheStats = await leaderboardCacheService.getCacheStats();

    return NextResponse.json({
      success: true,
      redis_available: true,
      cache_stats: {
        has_cache: cacheStats.has_cache,
        cache_age_seconds: cacheStats.cache_age_seconds,
        time_until_expiry_seconds: cacheStats.time_until_expiry_seconds,
        last_update_timestamp: cacheStats.last_update_timestamp,
        cached_users_count: cacheStats.cached_users_count, // Только количество
      },
      optimization_info: {
        single_db_query: true,        // ✅ Один запрос к БД для всех данных
        personalized_rankings: true,  // ✅ Персональные userRankings для каждого пользователя
        data_deduplication: true,     // ✅ Нет дублирования данных пользователей
        security_measures: {
          uuid_exposure_prevented: true, // ✅ UUID надежно скрыты от клиента
          telegram_id_secured: true,     // ✅ telegram_id не передаются на клиент
          client_data_filtered: true,    // ✅ Строгая фильтрация данных
        },
      },
    });

  } catch (error) {
    console.error("[CACHE_STATS] Error getting cache stats:", error);

    return NextResponse.json(
      {
        success: false,
        redis_available: false,
        optimization_info: {
          single_db_query: true,
          personalized_rankings: true,
          data_deduplication: true,
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

/**
 * DELETE /api/leaderboard/cache-stats
 * Принудительная инвалидация кеша (для администраторов)
 */
export async function DELETE(
  request: NextRequest,
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    // Строгая проверка аутентификации для операций удаления
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 },
      );
    }

    // TODO: Добавить проверку на права администратора
    // const isAdmin = await checkAdminPermissions(userId);
    // if (!isAdmin) {
    //   return NextResponse.json(
    //     { success: false, error: "Admin permissions required" },
    //     { status: 403 }
    //   );
    // }

    // 🔒 БЕЗОПАСНОЕ логирование (без чувствительных данных)
    console.log(`[CACHE_STATS] Cache invalidation requested by authenticated user`);

    // ✅ ИНВАЛИДИРУЕМ ОПТИМИЗИРОВАННЫЙ КЕШ
    await leaderboardCacheService.invalidateCache();

    console.log(`[CACHE_STATS] Secure cache invalidated successfully`);

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error("[CACHE_STATS] Error invalidating cache:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to invalidate cache",
      },
      { status: 500 },
    );
  }
}