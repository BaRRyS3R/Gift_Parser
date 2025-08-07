// src/app/api/tournaments/active/route.ts - Get active tournament API endpoint

import { NextRequest, NextResponse } from "next/server";
import { serverTournamentService } from "@/lib/server/tournamentService";
import type { Tournament } from "@/types/tournaments";

// Response interface
interface ActiveTournamentResponse {
    success: boolean;
    tournament?: Tournament;
    error?: string;
}

/**
 * GET /api/tournaments/active
 * Get the currently active tournament
 */
export async function GET(
    request: NextRequest,
): Promise<NextResponse<ActiveTournamentResponse>> {
    try {
        // Get the active tournament from the server service
        const activeTournament = await serverTournamentService.getActiveTournament();

        if (!activeTournament) {
            return NextResponse.json({
                success: true,
                tournament: undefined,
            });
        }

        return NextResponse.json({
            success: true,
            tournament: activeTournament,
        });
    } catch (error) {
        console.error("Error fetching active tournament:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch active tournament",
            },
            { status: 500 },
        );
    }
}

/**
 * OPTIONS /api/tournaments/active
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