// src/app/api/leaderboard/cache-stats/route.ts - Endpoint для получения статистики кеша

import { NextRequest, NextResponse } from "next/server";

import { leaderboardCacheService } from "@/lib/server/leaderboardCacheService";
import { checkRedisConnection } from "@/lib/redis";

// Response interface для статистики кеша
interface CacheStatsResponse {
  success: boolean;
  redis_available: boolean;
  cache_stats?: {
    has_cache: boolean;
    cache_age_seconds?: number;
    time_until_expiry_seconds?: number;
    last_update_timestamp?: number;
  };
  error?: string;
}

/**
 * GET /api/leaderboard/cache-stats
 * Получение статистики кеша лидерборда (для мониторинга и отладки)
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<CacheStatsResponse>> {
  try {
    // Базовая проверка аутентификации
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      return NextResponse.json(
        {
          success: false,
          redis_available: false,
          error: "Authentication required",
        },
        { status: 401 },
      );
    }

    // Проверяем доступность Redis
    const redisAvailable = await checkRedisConnection();

    if (!redisAvailable) {
      return NextResponse.json({
        success: true,
        redis_available: false,
        cache_stats: {
          has_cache: false,
        },
      });
    }

    // Получаем статистику кеша
    const cacheStats = await leaderboardCacheService.getCacheStats();

    return NextResponse.json({
      success: true,
      redis_available: true,
      cache_stats: cacheStats,
    });

  } catch (error) {
    console.error("Error getting cache stats:", error);

    return NextResponse.json(
      {
        success: false,
        redis_available: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/leaderboard/cache-stats
 * Принудительная инвалидация кеша (для админов)
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

    console.log(`[CACHE_STATS_API] Cache invalidation requested by user ${userId}`);

    // Инвалидируем кеш
    await leaderboardCacheService.invalidateCache();

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error("Error invalidating cache:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to invalidate cache",
      },
      { status: 500 },
    );
  }
}