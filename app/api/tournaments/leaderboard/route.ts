// src/app/api/tournaments/leaderboard/route.ts - Оптимизированный API лидерборда турниров

import { NextRequest, NextResponse } from "next/server";
import { tournamentCacheService } from "@/lib/server/tournamentCacheService";
import type { 
  Tournament,
  OptimizedTournamentLeaderboardEntry,
} from "@/types/tournaments";

// ✅ ИСПРАВЛЕННЫЙ Response interface с правильными полями
interface TournamentLeaderboardResponse {
  success: boolean;
  tournament?: Tournament;
  leaderboard?: OptimizedTournamentLeaderboardEntry[];
  user_stats?: {
    is_participating: boolean;
    user_score?: number;
    games_played?: number;
    is_in_top_100: boolean;
  };
  cache_info?: {
    is_from_cache: boolean;
    cached_at?: number;
    cache_age_seconds?: number;
    next_update_in_seconds?: number;
  };
  error?: string;
}

/**
 * GET /api/tournaments/leaderboard
 * ✅ Получение лидерборда турнира с оптимизированным кешированием
 * Query parameters: tournamentId - ID турнира для получения лидерборда
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

    // 🔒 ВАЖНО: userId (UUID) остается ТОЛЬКО на сервере и НЕ передается на клиент
    console.log(`[TOURNAMENT_LEADERBOARD_API] Request for tournament ${tournamentId} from telegram_id: ${telegramIdNumber} (UUID secured)`);

    // Получаем параметр limit из query string (по умолчанию: 100, максимум: 100)
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam), 1), 100)
      : 100;

    // Проверяем параметр force_refresh для принудительного обновления
    const forceRefresh = searchParams.get("force_refresh") === "true";

    if (forceRefresh) {
      console.log(`[TOURNAMENT_LEADERBOARD_API] Force refresh requested for tournament ${tournamentId}`);
      
      // Инвалидируем кеш перед получением свежих данных
      await tournamentCacheService.invalidateTournamentLeaderboard(tournamentId);
    }

    // ✅ ИСПОЛЬЗУЕМ ОПТИМИЗИРОВАННЫЙ КЕШИРУЮЩИЙ СЕРВИС
    const { leaderboard, cache_info } = await tournamentCacheService.getTournamentLeaderboard(
      tournamentId,
      userId, // 🔒 UUID используется ТОЛЬКО на сервере для персонализации
      telegramIdNumber,
      limit
    );

    // Логируем информацию о кеше (БЕЗ чувствительных данных)
    console.log(`[TOURNAMENT_LEADERBOARD_API] Response prepared:`, {
      tournament_id: tournamentId,
      entries_count: leaderboard.leaderboard.length,
      user_participating: leaderboard.user_stats?.is_participating || false,
      user_in_top_100: leaderboard.user_stats?.is_in_top_100 || false,
      from_cache: cache_info.is_from_cache,
      cache_age: cache_info.cache_age_seconds,
      next_update_in: cache_info.next_update_in_seconds,
      data_secured: true, // ✅ UUID не передаются на клиент
      personalized: true // ✅ user_stats персонализированы
    });

    // ✅ ИСПРАВЛЕНО: используем правильное поле user_stats
    const response = NextResponse.json({
      success: true,
      tournament: leaderboard.tournament,
      leaderboard: leaderboard.leaderboard, // ✅ Содержит ТОЛЬКО публичные данные
      user_stats: leaderboard.user_stats, // ✅ ИСПРАВЛЕНО: используем user_stats вместо userPosition
      cache_info
    });

    // Добавляем заголовки кеша для клиента (без чувствительной информации)
    response.headers.set("X-Cache-Status", cache_info.is_from_cache ? "HIT" : "MISS");
    response.headers.set("X-Cache-Age", cache_info.cache_age_seconds?.toString() || "0");
    response.headers.set("X-Next-Update", cache_info.next_update_in_seconds?.toString() || "0");
    response.headers.set("X-Data-Secured", "true"); // ✅ Подтверждаем безопасность данных
    response.headers.set("X-Personalized", "true"); // ✅ Подтверждаем персонализацию

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

    // ✅ ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ с персонализацией (БЕЗ UUID в ответе)
    await tournamentCacheService.invalidateTournamentLeaderboard(tournamentId);
    
    const { leaderboard, cache_info } = await tournamentCacheService.getTournamentLeaderboard(
      tournamentId,
      userId, // 🔒 UUID используется ТОЛЬКО на сервере
      telegramIdNumber,
      100
    );

    // ✅ ИСПРАВЛЕНО: используем правильное поле user_stats
    return NextResponse.json({
      success: true,
      tournament: leaderboard.tournament,
      leaderboard: leaderboard.leaderboard, // ✅ БЕЗ UUID
      user_stats: leaderboard.user_stats, // ✅ ИСПРАВЛЕНО: используем user_stats вместо userPosition
      cache_info
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