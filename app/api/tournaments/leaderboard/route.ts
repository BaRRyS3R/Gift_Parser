// src/app/api/tournaments/leaderboard/route.ts - Tournament leaderboard endpoint

import { NextRequest, NextResponse } from "next/server";
import { serverTournamentService } from "@/lib/server/tournamentService";
import type { TournamentLeaderboardResponse } from "@/types/tournaments";

/**
 * GET /api/tournaments/leaderboard?id=tournament_id&limit=100
 * Get tournament leaderboard using query parameters
 */
export async function GET(request: NextRequest): Promise<NextResponse<TournamentLeaderboardResponse>> {
    try {
        const url = new URL(request.url);
        const tournamentId = url.searchParams.get("id");
        const limitParam = url.searchParams.get("limit");

        if (!tournamentId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Tournament ID is required",
                },
                { status: 400 }
            );
        }

        const limit = limitParam ? Math.min(Math.max(parseInt(limitParam), 1), 500) : 100;
        const userId = request.headers.get("X-User-ID");

        const leaderboardData = await serverTournamentService.getTournamentLeaderboard(
            tournamentId,
            userId || undefined,
            limit
        );

        return NextResponse.json({
            success: true,
            data: leaderboardData,
        });
    } catch (error) {
        console.error("Error fetching tournament leaderboard:", error);

        if (error instanceof Error && error.message.includes("not found")) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Tournament not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch tournament leaderboard",
            },
            { status: 500 }
        );
    }
}
