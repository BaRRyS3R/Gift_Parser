// src/app/api/tournaments/submit/route.ts - Tournament result submission endpoint

import { NextRequest, NextResponse } from "next/server";
import { serverTournamentService } from "@/lib/server/tournamentService";
import type { TournamentSubmitResponse } from "@/types/tournaments";

interface SubmitRequest {
    tournamentId: string;
    gameScore: number;
}

/**
 * POST /api/tournaments/submit
 * Submit tournament result using request body
 */
export async function POST(request: NextRequest): Promise<NextResponse<TournamentSubmitResponse>> {
    try {
        // Extract user information from headers
        const userId = request.headers.get("X-User-ID");
        const telegramId = request.headers.get("X-Telegram-ID");

        if (!userId || !telegramId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User authentication required",
                },
                { status: 401 }
            );
        }

        const telegramIdNumber = parseInt(telegramId);
        if (isNaN(telegramIdNumber)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid user ID",
                },
                { status: 400 }
            );
        }

        // Parse request body
        let body: SubmitRequest;
        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid request body",
                },
                { status: 400 }
            );
        }

        const { tournamentId, gameScore } = body;

        // Validate input
        if (!tournamentId || typeof gameScore !== "number" || gameScore < 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid tournament ID or game score",
                },
                { status: 400 }
            );
        }

        // Check user participation eligibility
        const canParticipate = await serverTournamentService.canUserParticipate(tournamentId, userId);
        if (!canParticipate) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Cannot participate in this tournament",
                },
                { status: 403 }
            );
        }

        // Submit tournament result
        const submitResult = await serverTournamentService.submitTournamentResult(
            tournamentId,
            userId,
            telegramIdNumber,
            gameScore
        );

        return NextResponse.json({
            success: true,
            data: submitResult,
        });
    } catch (error) {
        console.error("Error submitting tournament result:", error);

        if (error instanceof Error) {
            if (error.message.includes("not found")) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Tournament not found",
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes("not active")) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Tournament is not active",
                    },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to submit tournament result",
            },
            { status: 500 }
        );
    }
}