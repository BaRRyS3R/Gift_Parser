// src/app/api/security/validate-gyroscope/route.ts - Simplified gyroscope validation

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
        const { verificationString } = await request.json();

        if (!verificationString || typeof verificationString !== 'string') {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing or invalid verification string",
                },
                { status: 400 },
            );
        }

        // Validate string length (14-16 characters as per requirements)
        const stringLength = verificationString.length;
        if (stringLength < 14 || stringLength > 16) {
            console.log(`Gyroscope validation failed for user ${telegramId}: invalid string length (${stringLength})`);

            // Apply penalty for invalid verification attempt
            await supabaseServer.rpc("update_trust_score", {
                user_telegram_id: parseInt(telegramId),
                score_change: -30,
            });

            // Block user for suspicious activity
            await supabaseServer.rpc("block_user", {
                user_telegram_id: parseInt(telegramId),
                reason: "suspicious_activity",
                duration_minutes: 10,
            });

            return NextResponse.json({
                success: false,
                error: "Invalid verification string length",
            });
        }

        // Successful gyroscope verification - set trust score to 50
        const { error: updateError } = await supabaseServer
            .from("users")
            .update({
                trust_score: 50,
                updated_at: new Date().toISOString(),
            })
            .eq("telegram_id", parseInt(telegramId));

        if (updateError) {
            console.error("Error updating trust score:", updateError);
            return NextResponse.json(
                {
                    success: false,
                    error: "Failed to update user trust score",
                },
                { status: 500 },
            );
        }

        // Log successful gyroscope verification
        try {
            await supabaseServer.from('security_logs').insert({
                telegram_id: parseInt(telegramId),
                event_type: 'gyroscope_verification_success',
                reason: 'motion_verification_completed',
                details: JSON.stringify({
                    string_length: stringLength,
                    verification_method: 'simplified_gyroscope'
                }),
                created_at: new Date().toISOString(),
            });
        } catch (logError) {
            console.error("Failed to log gyroscope verification:", logError);
            // Don't fail the request if logging fails
        }

        console.log(`Gyroscope verification successful for user ${telegramId}, trust score set to 50`);

        return NextResponse.json({
            success: true,
            message: "Gyroscope verification completed successfully",
            trustScore: 50,
        });

    } catch (error) {
        console.error("Gyroscope validation API error:", error);

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