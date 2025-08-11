// src/app/api/tournaments/route.ts - Tournament API with sanitized data

import { NextRequest, NextResponse } from "next/server";

import {
  serverTournamentService,
  type TournamentsData,
  type PublicTournamentLeaderboardEntry,
} from "@/lib/server/tournamentService";

// Response interfaces using sanitized data
interface TournamentsResponse {
  success: boolean;
  data?: TournamentsData;
  error?: string;
}

interface TournamentLeaderboardResponse {
  success: boolean;
  tournament?: any;
  leaderboard?: PublicTournamentLeaderboardEntry[];
  userPosition?: {
    position: number;
    entry: PublicTournamentLeaderboardEntry;
  };
  error?: string;
}

/**
 * GET /api/tournaments
 * Get all tournaments grouped by status (active, upcoming, completed)
 * OR get specific tournament and leaderboard if tournament query param is provided
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<TournamentsResponse | TournamentLeaderboardResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament");
    const telegramId = request.headers.get("X-Telegram-ID");

    console.log("Tournaments API called with params:", {
      tournament,
      telegramId,
    });

    // If tournament query parameter is provided, get specific tournament and leaderboard
    if (tournament) {
      try {
        console.log("Fetching tournament by query:", tournament);

        // Parse tournament identifier (e.g., "physics-week-32-2025")
        const tournamentData =
          await serverTournamentService.getTournamentByQuery(tournament);

        if (!tournamentData) {
          console.log("Tournament not found for query:", tournament);

          // Try to find any active tournament with matching mode
          const parts = tournament.split("-");

          if (parts.length >= 1) {
            const mode = parts[0];

            console.log("Looking for active tournament with mode:", mode);

            // Get all tournaments and find active one with matching mode
            const allTournaments =
              await serverTournamentService.getAllTournaments();
            const activeTournament = allTournaments.active;

            if (activeTournament && activeTournament.mode === mode) {
              console.log("Found active tournament for mode:", mode);

              // Get sanitized leaderboard for the active tournament
              const leaderboard =
                await serverTournamentService.getPublicTournamentLeaderboard(
                  activeTournament.id,
                  100,
                );

              // Get user's position if authenticated
              let userPosition = undefined;

              if (telegramId) {
                const telegramIdNumber = parseInt(telegramId);

                if (!isNaN(telegramIdNumber)) {
                  userPosition =
                    await serverTournamentService.getUserTournamentPosition(
                      activeTournament.id,
                      telegramIdNumber,
                    );
                }
              }

              return NextResponse.json({
                success: true,
                tournament: activeTournament,
                leaderboard,
                userPosition: userPosition || undefined,
              });
            }
          }

          return NextResponse.json(
            {
              success: false,
              error: "Tournament not found",
            },
            { status: 404 },
          );
        }

        console.log("Found tournament:", tournamentData.id);

        // Get sanitized tournament leaderboard
        const leaderboard =
          await serverTournamentService.getPublicTournamentLeaderboard(
            tournamentData.id,
            100,
          );

        console.log(
          "Fetched sanitized leaderboard with",
          leaderboard.length,
          "entries",
        );

        // Get user's position if authenticated
        let userPosition = undefined;

        if (telegramId) {
          const telegramIdNumber = parseInt(telegramId);

          if (!isNaN(telegramIdNumber)) {
            console.log(
              "Getting user position for telegram ID:",
              telegramIdNumber,
            );
            userPosition =
              await serverTournamentService.getUserTournamentPosition(
                tournamentData.id,
                telegramIdNumber,
              );
          }
        }

        console.log("User position:", userPosition);

        return NextResponse.json({
          success: true,
          tournament: tournamentData,
          leaderboard,
          userPosition: userPosition || undefined,
        });
      } catch (error) {
        console.error("Error fetching specific tournament:", error);

        return NextResponse.json(
          {
            success: false,
            error: `Failed to fetch tournament: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
          { status: 500 },
        );
      }
    }

    // Get all tournaments grouped by status
    try {
      console.log("Fetching all tournaments");

      const tournamentsData = await serverTournamentService.getAllTournaments();

      console.log("Fetched tournaments:", {
        active: !!tournamentsData.active,
        upcoming: tournamentsData.upcoming.length,
        completed: tournamentsData.completed.length,
      });

      return NextResponse.json({
        success: true,
        data: tournamentsData,
      });
    } catch (error) {
      console.error("Error fetching all tournaments:", error);

      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch tournaments: ${error instanceof Error ? error.message : "Unknown error"}`,
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
