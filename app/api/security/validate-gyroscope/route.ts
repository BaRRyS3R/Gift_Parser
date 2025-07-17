// src/app/api/security/validate-gyroscope/route.ts - Gyroscope validation API endpoint

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
        const {
            success,
            completedInTime,
            gyroscopeSupported = true,
        } = await request.json();

        if (success === undefined || completedInTime === undefined) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing required fields",
                },
                { status: 400 },
            );
        }

        console.log(`Gyroscope validation request for user ${telegramId}:`, {
            success,
            completedInTime,
            gyroscopeSupported,
        });

        if (success && completedInTime && gyroscopeSupported) {
            // Gyroscope verification passed - increase trust score significantly
            const { data: newTrustScore, error: trustError } =
                await supabaseServer.rpc("update_trust_score", {
                    user_telegram_id: parseInt(telegramId),
                    score_change: 40, // Highest reward for most difficult verification
                });

            if (trustError) {
                console.error("Error updating trust score:", trustError);
            }

            console.log(`Gyroscope verification passed for user ${telegramId}`);

            return NextResponse.json({
                success: true,
                newTrustScore,
            });
        } else {
            // Gyroscope verification failed or not supported - decrease trust score and block user
            const { error: trustError } = await supabaseServer.rpc(
                "update_trust_score",
                {
                    user_telegram_id: parseInt(telegramId),
                    score_change: -25, // Severe penalty for gyroscope issues
                },
            );

            if (trustError) {
                console.error("Error updating trust score:", trustError);
            }

            // Determine block reason and duration
            const blockReason = !gyroscopeSupported
                ? "gyroscope_not_supported"
                : "gyroscope_failed";

            // 2 hours block for both unsupported and failed gyroscope verification
            const blockDuration = 120; // 120 minutes = 2 hours

            console.log(`Applying block for user ${telegramId}:`, {
                blockReason,
                blockDuration: blockDuration,
                blockDurationDescription: "2 hours",
            });

            const { error: blockError } = await supabaseServer.rpc("block_user", {
                user_telegram_id: parseInt(telegramId),
                reason: blockReason,
                duration_minutes: blockDuration,
            });

            if (blockError) {
                console.error("Error blocking user:", blockError);
                return NextResponse.json(
                    {
                        success: false,
                        error: "Failed to apply security block",
                        message: blockError.message,
                    },
                    { status: 500 },
                );
            }

            const logMessage = !gyroscopeSupported
                ? `User ${telegramId} blocked for 2 hours due to unsupported gyroscope`
                : `User ${telegramId} blocked for 2 hours due to failed gyroscope verification`;

            console.log(logMessage);

            return NextResponse.json({
                success: false,
                newTrustScore: 0,
                blockDuration: blockDuration,
                blockReason: blockReason,
                message: !gyroscopeSupported
                    ? "Device does not support gyroscope verification. Account blocked for security reasons."
                    : "Gyroscope verification failed. Account temporarily blocked for 2 hours.",
            });
        }
    } catch (error) {
        console.error("Validate gyroscope API error:", error);

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