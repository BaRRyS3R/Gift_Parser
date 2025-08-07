// src/app/api/tournaments/route.ts - Main tournaments endpoint with query parameters

import { NextRequest, NextResponse } from "next/server";
import { serverTournamentService } from "@/lib/server/tournamentService";
import type {
    TournamentListResponse,
    TournamentDetailsResponse,
    TournamentFilters
} from "@/types/tournaments";

/**
 * GET /api/tournaments
 * Handles both tournament listing and individual tournament details based on query parameters
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const url = new URL(request.url);
        const tournamentId = url.searchParams.get("id");

        // If tournament ID is provided, return tournament details
        if (tournamentId) {
            return handleTournamentDetails(request, tournamentId);
        }

        // Otherwise, return tournament list
        return handleTournamentList(request);
    } catch (error) {
        console.error("Error in tournaments API:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 }
        );
    }
}

/**
 * Handle tournament list requests
 */
async function handleTournamentList(request: NextRequest): Promise<NextResponse<TournamentListResponse>> {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as any;
    const gameMode = url.searchParams.get("game_mode") as any;
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    const filters: TournamentFilters = {};

    if (status) filters.status = status;
    if (gameMode) filters.game_mode = gameMode;
    if (limitParam) filters.limit = Math.min(Math.max(parseInt(limitParam), 1), 100);
    if (offsetParam) filters.offset = Math.max(parseInt(offsetParam), 0);

    const tournaments = await serverTournamentService.getTournaments(filters);

    return NextResponse.json({
        success: true,
        data: tournaments,
    });
}

/**
 * Handle individual tournament details requests
 */
async function handleTournamentDetails(
    request: NextRequest,
    tournamentId: string
): Promise<NextResponse<TournamentDetailsResponse>> {
    const userId = request.headers.get("X-User-ID");

    const tournamentDetails = await serverTournamentService.getTournamentDetails(
        tournamentId,
        userId || undefined
    );

    return NextResponse.json({
        success: true,
        data: tournamentDetails,
    });
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        },
    });
}