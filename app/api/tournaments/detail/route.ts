// src/app/api/tournaments/detail/route.ts - Tournament detail API endpoint with sanitized data

import type {
    Tournament,
    PublicTournamentLeaderboardEntry,
} from "@/lib/server/tournamentService";

import { NextRequest, NextResponse } from "next/server";

import { serverTournamentService } from "@/lib/server/tournamentService";

// Response interface using sanitized data
interface TournamentDetailResponse {
    success: boolean;
    tournament?: Tournament;
    leaderboard?: PublicTournamentLeaderboardEntry[];
    userPosition?: {
        position: number;
        entry: PublicTournamentLeaderboardEntry;
    };
    error?: string;
}

/**
 * GET /api/tournaments/detail
 * Get tournament detail with sanitized leaderboard
 * Query parameters: tournamentId - The tournament ID to fetch details for
 */
export async function GET(
    request: NextRequest,
): Promise<NextResponse<TournamentDetailResponse>> {
    try {
        const { searchParams } = new URL(request.url);
        const tournamentId = searchParams.get("tournamentId");
        const telegramId = request.headers.get("X-Telegram-ID");

        if (!tournamentId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Tournament ID is required",
                },
                { status: 400 },
            );
        }

        // Get tournament by ID
        const tournament =
            await serverTournamentService.getTournamentById(tournamentId);

        if (!tournament) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Tournament not found",
                },
                { status: 404 },
            );
        }

        // Get sanitized tournament leaderboard
        const leaderboard = await serverTournamentService.getPublicTournamentLeaderboard(
            tournamentId,
            100,
        );

        // Get user's position if authenticated
        let userPosition = undefined;

        if (telegramId) {
            const telegramIdNumber = parseInt(telegramId);

            if (!isNaN(telegramIdNumber)) {
                userPosition = await serverTournamentService.getUserTournamentPosition(
                    tournamentId,
                    telegramIdNumber,
                );
            }
        }

        return NextResponse.json({
            success: true,
            tournament,
            leaderboard,
            userPosition: userPosition || undefined,
        });
    } catch (error) {
        console.error("Error fetching tournament detail:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch tournament detail",
            },
            { status: 500 },
        );
    }
}

/**
 * OPTIONS /api/tournaments/detail
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