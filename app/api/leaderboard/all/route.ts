// src/app/api/leaderboard/all/route.ts - ИСПРАВЛЕНА утечка UUID на клиент

import { NextRequest, NextResponse } from "next/server";

import { leaderboardCacheService, type LeaderboardCacheInfo } from "@/lib/server/leaderboardCacheService";
import type { AllLeaderboardsResponse } from "@/lib/server/leaderboardService";

// Response interface - БЕЗ чувствительных данных
interface LeaderboardResponse {
  success: boolean;
  data?: AllLeaderboardsResponse; // ✅ Содержит ТОЛЬКО публичные данные без UUID
  cache_info?: LeaderboardCacheInfo;
  error?: string;
}

/**
 * GET /api/leaderboard/all
 * ✅ ИСПРАВЛЕНО: UUID не передаются на клиент
 * - Один запрос к БД для всех пользователей
 * - Кеш содержит данные с UUID только для внутреннего использования
 * - UserRankings вычисляются персонально для каждого пользователя
 * - На клиент передаются только публичные данные (имя, позиция, результаты)
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<LeaderboardResponse>> {
  try {
    // Извлекаем информацию о пользователе из middleware headers
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      console.error("[LEADERBOARD_API] Missing authentication headers");
      return NextResponse.json(
        {
          success: false,
          error: "User authentication required",
        },
        { status: 401 },
      );
    }

    const telegramIdNumber = parseInt(telegramId);

    if (isNaN(telegramIdNumber)) {
      console.error("[LEADERBOARD_API] Invalid telegram ID format");
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID format",
        },
        { status: 400 },
      );
    }

    // 🔒 ВАЖНО: userId (UUID) остается ТОЛЬКО на сервере и НЕ передается на клиент
    console.log(`[LEADERBOARD_API] Request from telegram_id: ${telegramIdNumber} (UUID secured)`);

    // Получаем параметр limit из query string (по умолчанию: 100, максимум: 100)
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam), 1), 100)
      : 100;

    // Проверяем параметр force_refresh для принудительного обновления
    const forceRefresh = url.searchParams.get("force_refresh") === "true";

    let leaderboardResult;

    if (forceRefresh) {
      console.log(`[LEADERBOARD_API] Force refresh requested`);
      
      // ✅ ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ - получаем свежие данные и персонализируем
      try {
        const freshUsers = await leaderboardCacheService.forceRefresh();
        const processedData = leaderboardCacheService.processLeaderboardsForUser(
          freshUsers,
          userId, // 🔒 UUID используется ТОЛЬКО на сервере для personalization
          telegramIdNumber,
          limit
        );
        
        leaderboardResult = {
          leaderboard: processedData,
          cache_info: {
            is_from_cache: false,
            cached_at: Date.now(),
            cache_age_seconds: 0,
            next_update_in_seconds: 300 // 5 минут
          }
        };
      } catch (error) {
        console.error(`[LEADERBOARD_API] Force refresh failed:`, error);
        throw error;
      }
    } else {
      // ✅ ОБЫЧНЫЙ ЗАПРОС - используем оптимизированный кеш-сервис
      leaderboardResult = await leaderboardCacheService.getLeaderboard(
        userId, // 🔒 UUID используется ТОЛЬКО на сервере
        telegramIdNumber,
        limit
      );
    }

    // Логируем информацию о кеше (БЕЗ чувствительных данных)
    const cacheInfo = leaderboardResult.cache_info;
    console.log(`[LEADERBOARD_API] Response prepared:`, {
      from_cache: cacheInfo.is_from_cache,
      cache_age: cacheInfo.cache_age_seconds,
      next_update_in: cacheInfo.next_update_in_seconds,
      data_secured: true, // ✅ UUID не передаются на клиент
      personalized: true // ✅ userRankings персонализированы
    });

    // ✅ БЕЗОПАСНЫЙ ОТВЕТ - НЕ содержит UUID или другие чувствительные данные
    const response = NextResponse.json({
      success: true,
      data: leaderboardResult.leaderboard, // ✅ Содержит ТОЛЬКО публичные данные
      cache_info: leaderboardResult.cache_info
    });

    // Добавляем заголовки кеша для клиента (без чувствительной информации)
    response.headers.set("X-Cache-Status", cacheInfo.is_from_cache ? "HIT" : "MISS");
    response.headers.set("X-Cache-Age", cacheInfo.cache_age_seconds?.toString() || "0");
    response.headers.set("X-Next-Update", cacheInfo.next_update_in_seconds?.toString() || "0");
    response.headers.set("X-Data-Secured", "true"); // ✅ Подтверждаем безопасность данных
    response.headers.set("X-Personalized", "true"); // ✅ Подтверждаем персонализацию

    return response;

  } catch (error) {
    console.error("[LEADERBOARD_API] Error fetching leaderboards:", error);

    // ✅ FALLBACK - если кеш не работает, делаем прямой запрос (также БЕЗ UUID)
    try {
      const telegramId = request.headers.get("X-Telegram-ID");
      const userId = request.headers.get("X-User-ID");
      
      if (telegramId && userId) {
        const telegramIdNumber = parseInt(telegramId);
        const url = new URL(request.url);
        const limitParam = url.searchParams.get("limit");
        const limit = limitParam
          ? Math.min(Math.max(parseInt(limitParam), 1), 100)
          : 100;

        console.log("[LEADERBOARD_API] Using secure fallback - fetching directly from DB");
        
        // Прямой запрос к БД как fallback (БЕЗ UUID в ответе)
        const fallbackUsers = await leaderboardCacheService.fetchAllUsersFromDB();
        const fallbackData = leaderboardCacheService.processLeaderboardsForUser(
          fallbackUsers,
          userId, // 🔒 UUID используется ТОЛЬКО на сервере
          telegramIdNumber,
          limit
        );

        return NextResponse.json({
          success: true,
          data: fallbackData, // ✅ БЕЗ UUID
          cache_info: {
            is_from_cache: false,
            cached_at: Date.now(),
            cache_age_seconds: 0,
            next_update_in_seconds: 0 // Указываем, что кеш недоступен
          }
        });
      }
    } catch (fallbackError) {
      console.error("[LEADERBOARD_API] Fallback query also failed:", fallbackError);
    }

    // Обработка специфических типов ошибок
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("leaderboard") || error.message.includes("users")) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch leaderboard data",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve leaderboards",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/leaderboard/all
 * Принудительное обновление кеша лидерборда (БЕЗ UUID в ответе)
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<LeaderboardResponse>> {
  try {
    // Проверка прав доступа
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User authentication required",
        },
        { status: 401 },
      );
    }

    const telegramIdNumber = parseInt(telegramId);

    if (isNaN(telegramIdNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID format",
        },
        { status: 400 },
      );
    }

    console.log(`[LEADERBOARD_API] Manual cache refresh requested by telegram_id: ${telegramIdNumber}`);

    // ✅ ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ с персонализацией (БЕЗ UUID в ответе)
    const freshUsers = await leaderboardCacheService.forceRefresh();
    const processedData = leaderboardCacheService.processLeaderboardsForUser(
      freshUsers,
      userId, // 🔒 UUID используется ТОЛЬКО на сервере
      telegramIdNumber,
      100
    );

    return NextResponse.json({
      success: true,
      data: processedData, // ✅ БЕЗ UUID
      cache_info: {
        is_from_cache: false,
        cached_at: Date.now(),
        cache_age_seconds: 0,
        next_update_in_seconds: 300 // 5 минут
      }
    });

  } catch (error) {
    console.error("[LEADERBOARD_API] Error in manual cache refresh:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to refresh leaderboard cache",
      },
      { status: 500 },
    );
  }
}