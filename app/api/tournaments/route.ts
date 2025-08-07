// src/app/api/tournaments/route.ts - Tournament data and leaderboards API

import { NextRequest, NextResponse } from "next/server";

import {
  serverTournamentService,
  type TournamentsData,
  type TournamentLeaderboardEntry,
} from "@/lib/server/tournamentService";

// Response interfaces
interface TournamentsResponse {
  success: boolean;
  data?: TournamentsData;
  error?: string;
}

interface TournamentLeaderboardResponse {
  success: boolean;
  tournament?: any;
  leaderboard?: TournamentLeaderboardEntry[];
  userPosition?: {
    position: number;
    entry: TournamentLeaderboardEntry;
  };
  error?: string;
}

/**
 * GET /api/tournaments
 * Get all tournaments grouped by status (active, upcoming, completed)
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<TournamentsResponse | TournamentLeaderboardResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament");
    const telegramId = request.headers.get("X-Telegram-ID");

    // If tournament query parameter is provided, get specific tournament and leaderboard
    if (tournament) {
      // Parse tournament identifier (e.g., "physics-week-32-2025")
      const tournamentData =
        await serverTournamentService.getTournamentByQuery(tournament);

      if (!tournamentData) {
        return NextResponse.json(
          {
            success: false,
            error: "Tournament not found",
          },
          { status: 404 },
        );
      }

      // Get tournament leaderboard
      const leaderboard =
        await serverTournamentService.getTournamentLeaderboard(
          tournamentData.id,
          100,
        );

      // Get user's position if authenticated
      let userPosition = undefined;

      if (telegramId) {
        const telegramIdNumber = parseInt(telegramId);

        if (!isNaN(telegramIdNumber)) {
          const position =
            await serverTournamentService.getUserTournamentPosition(
              tournamentData.id,
              telegramIdNumber,
            );

          userPosition = position || undefined;
        }
      }

      return NextResponse.json({
        success: true,
        tournament: tournamentData,
        leaderboard,
        userPosition,
      });
    }

    // Get all tournaments grouped by status
    const tournamentsData = await serverTournamentService.getAllTournaments();

    return NextResponse.json({
      success: true,
      data: tournamentsData,
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tournaments",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/tournaments
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
