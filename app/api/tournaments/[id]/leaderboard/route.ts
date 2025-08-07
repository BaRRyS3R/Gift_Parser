// src/app/api/tournaments/[id]/leaderboard/route.ts - Лидерборд турнира

import { NextRequest, NextResponse } from "next/server";
import { serverTournamentService } from "@/lib/server/tournamentService";
import type { TournamentLeaderboardResponse } from "@/types/tournaments";

interface LeaderboardRouteParams {
    params: {
        id: string;
    };
}

/**
 * GET /api/tournaments/[id]/leaderboard
 * Получение лидерборда турнира
 */
export async function GET(
    request: NextRequest,
    { params }: LeaderboardRouteParams
): Promise<NextResponse<TournamentLeaderboardResponse>> {
    try {
        const { id } = params;

        // Извлекаем параметры запроса
        const url = new URL(request.url);
        const limitParam = url.searchParams.get("limit");
        const limit = limitParam ? Math.min(Math.max(parseInt(limitParam), 1), 500) : 100;

        // Извлекаем информацию о пользователе
        const userId = request.headers.get("X-User-ID");

        const leaderboardData = await serverTournamentService.getTournamentLeaderboard(
            id,
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