// src/app/api/tournaments/route.ts - ОПТИМИЗИРОВАНО: упрощенный API без расчета позиций на сервере

import { NextRequest, NextResponse } from "next/server";
import { tournamentCacheService } from "@/lib/server/tournamentCacheService";
import type { 
  Tournament,
  OptimizedTournamentLeaderboardEntry,
} from "@/types/tournaments";

// Упрощенные response интерфейсы
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

// УПРОЩЕНО: без точной позиции пользователя, только базовая статистика
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
 * Нормализация данных турнира для правильной передачи на клиент
 */
function normalizeTournamentData(tournament: Tournament | null): Tournament | null {
  if (!tournament) return null;

  const normalizedTournament: Tournament = {
    ...tournament,
    mode: tournament.mode || (tournament as any).game_mode || 'survival',
    prizes: tournament.prizes || [],
  };

  console.log("[TOURNAMENTS_API] Normalized tournament data:", {
    id: normalizedTournament.id,
    name: normalizedTournament.name,
    mode: normalizedTournament.mode,
    status: normalizedTournament.status,
    prizes_count: normalizedTournament.prizes.length
  });

  return normalizedTournament;
}

/**
 * GET /api/tournaments
 * ОПТИМИЗИРОВАНО: упрощенная логика без серверного расчета позиций
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ActiveTournamentResponse | TournamentLeaderboardResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournamentId");
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    console.log("Tournaments API called:", { 
      tournamentId, 
      hasAuth: !!telegramId,
      isLeaderboardRequest: !!tournamentId
    });

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

        // УПРОЩЕНО: получаем данные через упрощенный кеш-сервис
        const { leaderboard, cache_info } = await tournamentCacheService.getTournamentLeaderboard(
          tournamentId,
          userId,
          telegramIdNumber,
          100 // Всегда топ-100
        );

        // Нормализуем данные турнира
        const normalizedTournament = normalizeTournamentData(leaderboard.tournament);

        console.log("Tournament leaderboard fetched:", {
          tournament_id: normalizedTournament?.id,
          tournament_mode: normalizedTournament?.mode,
          entries_count: leaderboard.leaderboard.length,
          user_participating: leaderboard.user_stats?.is_participating || false,
          user_in_top_100: leaderboard.user_stats?.is_in_top_100 || false,
          from_cache: cache_info.is_from_cache
        });

        return NextResponse.json({
          success: true,
          tournament: normalizedTournament,
          leaderboard: leaderboard.leaderboard,
          user_stats: leaderboard.user_stats,
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

      const { tournament, cache_info } = await tournamentCacheService.getActiveTournament();

      const normalizedTournament = normalizeTournamentData(tournament);

      console.log("Active tournament fetched:", {
        tournament_id: normalizedTournament?.id || 'null',
        tournament_name: normalizedTournament?.name || 'none',
        tournament_mode: normalizedTournament?.mode || 'none',
        status: normalizedTournament?.status || 'none',
        prizes_count: normalizedTournament?.prizes?.length || 0,
        from_cache: cache_info.is_from_cache
      });

      return NextResponse.json({
        success: true,
        tournament: normalizedTournament,
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
 * Принудительное обновление кеша турниров
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ActiveTournamentResponse>> {
  try {
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

    await tournamentCacheService.invalidateActiveTournament();

    const { tournament, cache_info } = await tournamentCacheService.getActiveTournament();

    const normalizedTournament = normalizeTournamentData(tournament);

    console.log("Tournament cache refreshed:", {
      tournament_id: normalizedTournament?.id || 'null',
      tournament_mode: normalizedTournament?.mode || 'none',
      from_cache: cache_info.is_from_cache
    });

    return NextResponse.json({
      success: true,
      tournament: normalizedTournament,
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