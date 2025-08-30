// src/app/api/tournaments/route.ts - API турниров с Redis кешированием

import { NextRequest, NextResponse } from "next/server";
import { serverTournamentService } from "@/lib/server/tournamentService";
import type { PublicTournamentData, TournamentResponseWithCache } from "@/lib/server/tournamentCacheService";

// Response interfaces using sanitized data
interface TournamentsResponse {
  success: boolean;
  tournament?: PublicTournamentData;
  cache_info?: {
    is_from_cache: boolean;
    cached_at?: number;
    cache_age_seconds?: number;
    next_update_in_seconds?: number;
  };
  error?: string;
}

/**
 * GET /api/tournaments
 * ✅ УПРОЩЕННАЯ ВЕРСИЯ: возвращает только активный турнир с лидербордом
 * Больше не возвращает upcoming/completed турниры
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<TournamentsResponse>> {
  try {
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      console.error("Missing authentication headers for tournaments API");
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const telegramIdNumber = parseInt(telegramId);

    if (isNaN(telegramIdNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID format",
        },
        { status: 400 }
      );
    }

    console.log(`[TOURNAMENTS_API] Getting active tournament for telegram_id: ${telegramIdNumber}`);

    // Извлекаем параметры
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 100);
    const forceRefresh = searchParams.get("force_refresh") === "true";

    try {
      let result: TournamentResponseWithCache;

      if (forceRefresh) {
        console.log("[TOURNAMENTS_API] Force refresh requested");
        // Принудительно обновляем кеш
        await serverTournamentService.forceRefreshTournamentCache();
        
        // Получаем свежие данные
        result = await serverTournamentService.getActiveTournamentWithLeaderboard(
          userId, // 🔒 UUID остается на сервере
          telegramIdNumber,
          limit
        );
      } else {
        // Обычный запрос с кешированием
        result = await serverTournamentService.getActiveTournamentWithLeaderboard(
          userId, // 🔒 UUID остается на сервере  
          telegramIdNumber,
          limit
        );
      }

      // Логируем информацию о кеше
      if (result.cache_info) {
        console.log(`[TOURNAMENTS_API] Tournament data served:`, {
          has_tournament: !!result.tournament,
          from_cache: result.cache_info.is_from_cache,
          cache_age: result.cache_info.cache_age_seconds,
          participants: result.tournament?.stats.totalParticipants || 0
        });
      }

      return NextResponse.json({
        success: true,
        tournament: result.tournament || undefined,
        cache_info: result.cache_info,
      });

    } catch (error) {
      console.error("Error fetching active tournament:", error);

      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch tournament: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in tournaments API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tournaments
 * Принудительное обновление кеша турниров
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<TournamentsResponse>> {
  try {
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const telegramIdNumber = parseInt(telegramId);

    if (isNaN(telegramIdNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID format",
        },
        { status: 400 }
      );
    }

    console.log(`[TOURNAMENTS_API] Manual cache refresh requested by telegram_id: ${telegramIdNumber}`);

    try {
      // Принудительно обновляем кеш
      await serverTournamentService.forceRefreshTournamentCache();

      // Получаем свежие данные
      const result = await serverTournamentService.getActiveTournamentWithLeaderboard(
        userId, // 🔒 UUID остается на сервере
        telegramIdNumber,
        100
      );

      return NextResponse.json({
        success: true,
        tournament: result.tournament || undefined,
        cache_info: result.cache_info,
      });

    } catch (error) {
      console.error("Error in manual tournament cache refresh:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to refresh tournament cache",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in tournaments POST API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}