// src/app/api/leaderboard/all/route.ts - Обновленный endpoint с Redis кешированием

import { NextRequest, NextResponse } from "next/server";

import { leaderboardCacheService, type LeaderboardCacheInfo } from "@/lib/server/leaderboardCacheService";
import { serverLeaderboardService, type AllLeaderboardsResponse } from "@/lib/server/leaderboardService";

// Расширенный интерфейс ответа с информацией о кеше
interface LeaderboardResponse {
  success: boolean;
  data?: AllLeaderboardsResponse;
  cache_info?: LeaderboardCacheInfo;
  error?: string;
}

/**
 * GET /api/leaderboard/all
 * Получение всех лидербордов с поддержкой Redis кеширования
 * Кеш обновляется каждые 5 минут
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<LeaderboardResponse>> {
  try {
    // Извлекаем информацию о пользователе из middleware headers
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
          error: "Invalid user ID",
        },
        { status: 400 },
      );
    }

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
      console.log(`[LEADERBOARD_API] Force refresh requested by user ${userId}`);
      
      // Принудительное обновление кеша
      const freshData = await leaderboardCacheService.forceRefresh(
        userId,
        telegramIdNumber,
        limit
      );
      
      leaderboardResult = {
        leaderboard: freshData,
        cache_info: {
          is_from_cache: false,
          cached_at: Date.now(),
          cache_age_seconds: 0,
          next_update_in_seconds: 300 // 5 минут
        }
      };
    } else {
      // Обычный запрос с кешированием
      leaderboardResult = await leaderboardCacheService.getLeaderboard(
        userId,
        telegramIdNumber,
        limit
      );
    }

    // Логируем информацию о кеше
    const cacheInfo = leaderboardResult.cache_info;
    console.log(`[LEADERBOARD_API] Request completed for user ${userId}:`, {
      from_cache: cacheInfo.is_from_cache,
      cache_age: cacheInfo.cache_age_seconds,
      next_update_in: cacheInfo.next_update_in_seconds
    });

    // Добавляем заголовки для отладки кеша
    const response = NextResponse.json({
      success: true,
      data: leaderboardResult.leaderboard,
      cache_info: leaderboardResult.cache_info
    });

    // Добавляем заголовки кеша для клиента
    response.headers.set("X-Cache-Status", cacheInfo.is_from_cache ? "HIT" : "MISS");
    response.headers.set("X-Cache-Age", cacheInfo.cache_age_seconds?.toString() || "0");
    response.headers.set("X-Next-Update", cacheInfo.next_update_in_seconds?.toString() || "0");

    return response;

  } catch (error) {
    console.error("Error fetching leaderboards:", error);

    // При ошибке кеша делаем fallback к прямому запросу
    if (error instanceof Error && error.message.includes("Redis")) {
      console.log("[LEADERBOARD_API] Redis error, falling back to direct DB query");
      
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

          const fallbackData = await serverLeaderboardService.getAllLeaderboards(
            userId,
            telegramIdNumber,
            limit
          );

          return NextResponse.json({
            success: true,
            data: fallbackData,
            cache_info: {
              is_from_cache: false,
              cached_at: Date.now(),
              cache_age_seconds: 0,
              next_update_in_seconds: 0 // Указываем, что кеш недоступен
            }
          });
        }
      } catch (fallbackError) {
        console.error("Fallback query also failed:", fallbackError);
      }
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

      if (error.message.includes("leaderboard")) {
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
 * Принудительное обновление кеша лидерборда (для админов)
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
          error: "Invalid user ID",
        },
        { status: 400 },
      );
    }

    console.log(`[LEADERBOARD_API] Manual cache refresh requested by user ${userId}`);

    // Принудительное обновление кеша
    const freshData = await leaderboardCacheService.forceRefresh(
      userId,
      telegramIdNumber,
      100
    );

    return NextResponse.json({
      success: true,
      data: freshData,
      cache_info: {
        is_from_cache: false,
        cached_at: Date.now(),
        cache_age_seconds: 0,
        next_update_in_seconds: 300 // 5 минут
      }
    });

  } catch (error) {
    console.error("Error in manual cache refresh:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to refresh leaderboard cache",
      },
      { status: 500 },
    );
  }
}
