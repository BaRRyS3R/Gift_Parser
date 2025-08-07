// src/app/api/tournaments/route.ts - Main tournaments endpoint

import { NextRequest, NextResponse } from "next/server";
import { serverTournamentService, type Tournament } from "@/lib/server/tournamentService";

// Response interface for tournaments list
interface TournamentsResponse {
    success: boolean;
    data?: {
        active: Tournament | null;
        upcoming: Tournament[];
        completed: Tournament[];
    };
    error?: string;
}

/**
 * GET /api/tournaments
 * Get tournaments summary with active, upcoming, and completed tournaments
 */
export async function GET(
    request: NextRequest,
): Promise<NextResponse<TournamentsResponse>> {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as Tournament['status'] | null;
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');

        if (status) {
            // Get tournaments with specific status
            const tournaments = await serverTournamentService.getTournaments(status, limit, offset);

            return NextResponse.json({
                success: true,
                data: {
                    active: null,
                    upcoming: status === 'upcoming' ? tournaments : [],
                    completed: status === 'completed' ? tournaments : [],
                },
            });
        } else {
            // Get tournaments summary
            const summary = await serverTournamentService.getTournamentsSummary();

            return NextResponse.json({
                success: true,
                data: summary,
            });
        }
    } catch (error) {
        console.error("Error fetching tournaments:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch tournaments",
            },
            { status: 500 }
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