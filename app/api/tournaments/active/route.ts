// src/app/api/tournaments/active/route.ts - Get current active tournament
import { NextRequest, NextResponse } from "next/server";
import { serverTournamentService, type Tournament } from "@/lib/server/tournamentService";

export async function GET_ACTIVE_TOURNAMENT(
    request: NextRequest,
): Promise<NextResponse<{ success: boolean; data?: Tournament; error?: string }>> {
    try {
        const activeTournament = await serverTournamentService.getActiveTournament();

        return NextResponse.json({
            success: true,
            data: activeTournament || undefined,
        });
    } catch (error) {
        console.error("Error fetching active tournament:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch active tournament",
            },
            { status: 500 }
        );
    }
}