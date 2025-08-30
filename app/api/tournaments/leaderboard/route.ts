// src/app/api/tournaments/leaderboard/route.ts - ОБНОВЛЕНО: использование полного кеширования

import { NextRequest, NextResponse } from "next/server";
import { tournamentCacheService } from "@/lib/server/tournamentCacheService";
import type { 
  Tournament,
} from "@/types/tournaments";

// ✅ ОБНОВЛЕННЫЙ Response interface с полными данными из кеша
interface TournamentLeaderboardResponse {
  success: boolean;
  tournament?: Tournament;
  leaderboard?: Array<{
    first_name: string;
    last_name?: string;
    username?: string;
    best_score: number;
    updated_at: string;
    isCurrentUser?: boolean;
  }>;
  user_stats?: {
    is_participating: boolean;
    user_score?: number;
    games_played?: number;
    user_position?: number; // ✅ Точная позиция из кеша
    is_in_top_100: boolean;
  };
  cache_info?: {
    is_from_cache: boolean;
    cached_at?: number;
    cache_age_seconds?: number;
    next_update_in_seconds?: number;
    total_participants_in_cache: number; // ✅ ДОБАВЛЕНО
  };
  data_source?: 'redis' | 'database'; // ✅ ДОБАВЛЕНО для индикации источника
  error?: string;
}

/**
 * GET /api/tournaments/leaderboard
 * ✅ Получение лидерборда турнира с полным кешированием всех участников
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<TournamentLeaderboardResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournamentId");
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    // Валидация обязательных параметров
    if (!tournamentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Tournament ID is required",
        },
        { status: 400 },
      );
    }

    if (!telegramId || !userId) {
      console.error("[TOURNAMENT_LEADERBOARD_API] Missing authentication headers");
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
      console.error("[TOURNAMENT_LEADERBOARD_API] Invalid telegram ID format");
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID format",
        },
        { status: 400 },
      );
    }

    console.log(`[TOURNAMENT_LEADERBOARD_API] Request for tournament ${tournamentId} from telegram_id: ${telegramIdNumber}`);

    // Получаем параметр limit из query string (по умолчанию: 100, максимум: 500 для больших турниров)
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam), 1), 500)
      : 100;

    // Проверяем параметр force_refresh для принудительного обновления
    const forceRefresh = searchParams.get("force_refresh") === "true";

    if (forceRefresh) {
      console.log(`[TOURNAMENT_LEADERBOARD_API] Force refresh requested for tournament ${tournamentId}`);
      await tournamentCacheService.invalidateTournamentLeaderboard(tournamentId);
    }

    // ✅ ИСПОЛЬЗУЕМ ОБНОВЛЕННЫЙ КЕШИРУЮЩИЙ СЕРВИС с полным кешированием
    const { leaderboard, cache_info } = await tournamentCacheService.getTournamentLeaderboard(
      tournamentId,
      userId, // 🔒 UUID используется ТОЛЬКО на сервере
      telegramIdNumber,
      limit
    );

    // Логируем информацию о кеше и данных
    console.log(`[TOURNAMENT_LEADERBOARD_API] Response prepared:`, {
      tournament_id: tournamentId,
      entries_count: leaderboard.leaderboard.length,
      user_participating: leaderboard.user_stats.is_participating,
      user_position: leaderboard.user_stats.user_position || 'not participating',
      total_cached: cache_info.total_participants_in_cache,
      from_cache: cache_info.is_from_cache,
      cache_age: cache_info.cache_age_seconds,
      data_source: leaderboard.data_source,
    });

    // ✅ ПОЛНЫЙ ОТВЕТ с данными из кеша
    const response = NextResponse.json({
      success: true,
      tournament: leaderboard.tournament,
      leaderboard: leaderboard.leaderboard, // ✅ Топ-N с флагом isCurrentUser
      user_stats: leaderboard.user_stats, // ✅ Полная статистика включая точную позицию
      cache_info: {
        is_from_cache: cache_info.is_from_cache,
        cached_at: cache_info.cached_at,
        cache_age_seconds: cache_info.cache_age_seconds,
        next_update_in_seconds: cache_info.next_update_in_seconds,
        total_participants_in_cache: cache_info.total_participants_in_cache,
      },
      data_source: leaderboard.data_source,
    });

    // Добавляем заголовки для клиента
    response.headers.set("X-Cache-Status", cache_info.is_from_cache ? "HIT" : "MISS");
    response.headers.set("X-Cache-Age", cache_info.cache_age_seconds?.toString() || "0");
    response.headers.set("X-Next-Update", cache_info.next_update_in_seconds?.toString() || "0");
    response.headers.set("X-Total-Participants", cache_info.total_participants_in_cache.toString());
    response.headers.set("X-Data-Source", leaderboard.data_source); // ✅ Источник данных
    response.headers.set("X-Data-Secured", "true");
    response.headers.set("X-Full-Cache", "true"); // ✅ Полное кеширование

    return response;

  } catch (error) {
    console.error("[TOURNAMENT_LEADERBOARD_API] Error fetching tournament leaderboard:", error);

    // Обработка специфических типов ошибок
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Tournament not found",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("leaderboard") || error.message.includes("tournament")) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch tournament leaderboard",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve tournament leaderboard",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tournaments/leaderboard
 * ✅ Принудительное обновление кеша лидерборда турнира
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<TournamentLeaderboardResponse>> {
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

    const body = await request.json();
    const { tournamentId } = body;

    if (!tournamentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Tournament ID is required",
        },
        { status: 400 },
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

    console.log(`[TOURNAMENT_LEADERBOARD_API] Manual cache refresh requested for tournament ${tournamentId} by telegram_id: ${telegramIdNumber}`);

    // ✅ ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ с полным кешированием
    await tournamentCacheService.invalidateTournamentLeaderboard(tournamentId);
    
    const { leaderboard, cache_info } = await tournamentCacheService.getTournamentLeaderboard(
      tournamentId,
      userId, // 🔒 UUID используется ТОЛЬКО на сервере
      telegramIdNumber,
      100
    );

    return NextResponse.json({
      success: true,
      tournament: leaderboard.tournament,
      leaderboard: leaderboard.leaderboard,
      user_stats: leaderboard.user_stats, // ✅ Полная статистика
      cache_info: {
        is_from_cache: cache_info.is_from_cache,
        cached_at: cache_info.cached_at,
        cache_age_seconds: cache_info.cache_age_seconds,
        next_update_in_seconds: cache_info.next_update_in_seconds,
        total_participants_in_cache: cache_info.total_participants_in_cache,
      },
      data_source: leaderboard.data_source,
    });

  } catch (error) {
    console.error("[TOURNAMENT_LEADERBOARD_API] Error in manual cache refresh:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to refresh tournament leaderboard cache",
      },
      { status: 500 },
    );
  }
}