// src/app/api/security/set-trust-score/route.ts - Set absolute trust score API endpoint

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
    try {
        // Get user ID from middleware-added header
        const userId = request.headers.get("x-user-id");
        const telegramId = request.headers.get("x-telegram-id");

        if (!userId || !telegramId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User authentication required",
                },
                { status: 401 },
            );
        }

        // Parse request body
        const { newScore } = await request.json();

        if (newScore === undefined || typeof newScore !== "number") {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid new score value",
                },
                { status: 400 },
            );
        }

        // Validate score range
        if (newScore < 0 || newScore > 100) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Trust score must be between 0 and 100",
                },
                { status: 400 },
            );
        }

        // Use RPC function to set absolute trust score
        const { data: updatedScore, error } = await supabaseServer.rpc(
            "update_trust_score_absolute",
            {
                user_telegram_id: parseInt(telegramId),
                new_score: newScore,
            },
        );

        if (error) {
            console.error("Error setting absolute trust score:", error);

            return NextResponse.json(
                {
                    success: false,
                    error: "Failed to set trust score",
                    message: error.message,
                },
                { status: 500 },
            );
        }

        console.log(
            `Trust score set to absolute value for user ${telegramId}: ${newScore}`,
        );

        return NextResponse.json({
            success: true,
            newTrustScore: updatedScore || newScore,
        });
    } catch (error) {
        console.error("Set trust score API error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
                message:
                    error instanceof Error ? error.message : "Unknown error occurred",
            },
            { status: 500 },
        );
    }
}