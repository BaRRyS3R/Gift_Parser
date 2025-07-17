// src/app/api/security/unblock-check/route.ts - Secure unblock check API endpoint

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

        // Call the secure RPC function to check and unblock user
        const { data, error } = await supabaseServer.rpc("check_and_unblock_user", {
            user_telegram_id: parseInt(telegramId),
        });

        if (error) {
            console.error("Error checking and unblocking user:", error);
            return NextResponse.json(
                {
                    success: false,
                    error: "Failed to check unblock status",
                    message: error.message,
                },
                { status: 500 },
            );
        }

        console.log(`Unblock check completed for user ${telegramId}:`, data);

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Unblock check API error:", error);

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