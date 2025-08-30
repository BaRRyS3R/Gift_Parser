// src/app/api/tournaments/route.ts - ИСПРАВЛЕНО: оптимизированный API с кешированием

import { NextRequest, NextResponse } from "next/server";
import { tournamentCacheService } from "@/lib/server/tournamentCacheService";
import type { 
  Tournament,
  OptimizedTournamentLeaderboardEntry,
  TournamentUserPosition 
} from "@/types/tournaments";

// ✅ УПРОЩЕННЫЕ response интерфейсы (только активный турнир)
interface ActiveTournamentResponse {
  success: boolean;
  tournament?: Tournament | null;
  cache_info?: {
    is_from_cache: boolean;
    cached_at?: number;
    cache_age_seconds?: number;
    next_update_in_seconds?: number;
  };
  error?: string;
}

interface TournamentLeaderboardResponse {
  success: boolean;
  tournament?: Tournament;
  leaderboard?: OptimizedTournamentLeaderboardEntry[];
  userPosition?: TournamentUserPosition;
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
 * ✅ ИСПРАВЛЕНО: только активный турнир с оптимизированным кешированием
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ActiveTournamentResponse | TournamentLeaderboardResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournamentId");
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    console.log("Tournaments API called:", { tournamentId, hasAuth: !!telegramId });

    // Если запрашивается лидерборд конкретного турнира
    if (tournamentId && telegramId && userId) {
      try {
        console.log("Fetching tournament leaderboard:", tournamentId);

        const telegramIdNumber = parseInt(telegramId);
        if (isNaN(telegramIdNumber)) {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid telegram ID",
            },
            { status: 400 },
          );
        }

        // ✅ ИСПОЛЬЗУЕМ ОПТИМИЗИРОВАННЫЙ КЕШИРУЮЩИЙ СЕРВИС
        const { leaderboard, cache_info } = await tournamentCacheService.getTournamentLeaderboard(
          tournamentId,
          userId, // 🔒 UUID остается ТОЛЬКО на сервере
          telegramIdNumber,
          100 // limit
        );

        console.log("Tournament leaderboard fetched:", {
          tournament_id: leaderboard.tournament.id,
          entries_count: leaderboard.leaderboard.length,
          user_position: leaderboard.userPosition?.position,
          from_cache: cache_info.is_from_cache
        });

        return NextResponse.json({
          success: true,
          tournament: leaderboard.tournament,
          leaderboard: leaderboard.leaderboard, // ✅ БЕЗ UUID
          userPosition: leaderboard.userPosition,
          cache_info,
        });

      } catch (error) {
        console.error("Error fetching tournament leaderboard:", error);

        return NextResponse.json(
          {
            success: false,
            error: `Failed to fetch tournament leaderboard: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
          { status: 500 },
        );
      }
    }

    // По умолчанию возвращаем активный турнир
    try {
      console.log("Fetching active tournament");

      // ✅ ИСПОЛЬЗУЕМ ОПТИМИЗИРОВАННЫЙ КЕШИРУЮЩИЙ СЕРВИС
      const { tournament, cache_info } = await tournamentCacheService.getActiveTournament();

      console.log("Active tournament fetched:", {
        tournament_id: tournament?.id || 'null',
        tournament_name: tournament?.name || 'none',
        status: tournament?.status || 'none',
        from_cache: cache_info.is_from_cache
      });

      return NextResponse.json({
        success: true,
        tournament, // Может быть null если нет активного турнира
        cache_info,
      });

    } catch (error) {
      console.error("Error fetching active tournament:", error);

      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch active tournament: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Unexpected error in tournaments API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tournaments
 * ✅ Принудительное обновление кеша турниров
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ActiveTournamentResponse>> {
  try {
    // Проверка аутентификации
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

    console.log("Manual tournament cache refresh requested");

    // Инвалидируем существующий кеш
    await tournamentCacheService.invalidateActiveTournament();

    // Получаем свежие данные
    const { tournament, cache_info } = await tournamentCacheService.getActiveTournament();

    console.log("Tournament cache refreshed:", {
      tournament_id: tournament?.id || 'null',
      from_cache: cache_info.is_from_cache
    });

    return NextResponse.json({
      success: true,
      tournament,
      cache_info,
    });

  } catch (error) {
    console.error("Error refreshing tournament cache:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to refresh tournament cache",
      },
      { status: 500 },
    );
  }
}