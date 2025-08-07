// src/app/api/tournaments/detail/route.ts - Tournament detail with leaderboard

import { NextRequest, NextResponse } from "next/server";
import { serverTournamentService, type Tournament, type TournamentLeaderboardEntry } from "@/lib/server/tournamentService";

// Response interface for tournament detail
interface TournamentDetailResponse {
    success: boolean;
    data?: {
        tournament: Tournament;
        leaderboard: TournamentLeaderboardEntry[];
        userRank?: {
            rank: number;
            entry: TournamentLeaderboardEntry;
        };
        totalParticipants: number;
    };
    error?: string;
}

/**
 * GET /api/tournaments/detail?tournament=physics-week-32-2025
 * Get tournament details with leaderboard and user's position
 */
export async function GET(
    request: NextRequest,
): Promise<NextResponse<TournamentDetailResponse>> {
    try {
        const { searchParams } = new URL(request.url);
        const tournamentQuery = searchParams.get('tournament');
        const limit = parseInt(searchParams.get('limit') || '100');

        if (!tournamentQuery) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Tournament parameter is required",
                },
                { status: 400 }
            );
        }

        // Parse tournament query to extract tournament ID
        // Format: physics-week-32-2025 or tournament ID
        let tournament: Tournament | null = null;

        // First try to get by direct ID
        tournament = await serverTournamentService.getTournamentById(tournamentQuery);

        // If not found, try to find by name pattern or current active tournament
        if (!tournament) {
            // For now, try to get active tournament if query suggests current tournament
            if (tournamentQuery.includes('current') || tournamentQuery.includes('active')) {
                tournament = await serverTournamentService.getActiveTournament();
            } else {
                // Try to find by partial name match
                const allTournaments = await serverTournamentService.getTournaments(undefined, 50);
                tournament = allTournaments.find(t =>
                    t.name.toLowerCase().includes(tournamentQuery.toLowerCase()) ||
                    t.id === tournamentQuery
                ) || null;
            }
        }

        if (!tournament) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Tournament not found",
                },
                { status: 404 }
            );
        }

        // Get leaderboard
        const leaderboard = await serverTournamentService.getTournamentLeaderboard(
            tournament.id,
            limit
        );

        // Get user's rank if authenticated
        let userRank: { rank: number; entry: TournamentLeaderboardEntry } | undefined;
        const telegramId = request.headers.get("X-Telegram-ID");

        if (telegramId) {
            const telegramIdNumber = parseInt(telegramId);
            if (!isNaN(telegramIdNumber)) {
                userRank = await serverTournamentService.getUserTournamentRank(
                    tournament.id,
                    telegramIdNumber
                ) || undefined;
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                tournament,
                leaderboard,
                userRank,
                totalParticipants: leaderboard.length,
            },
        });
    } catch (error) {
        console.error("Error fetching tournament detail:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch tournament details",
            },
            { status: 500 }
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

