// src/app/api/security/user-blocks/route.ts - Secure user blocks information API endpoint

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
    try {
        // Extract authentication information from request headers
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

        // Parse query parameters for filtering options
        const url = new URL(request.url);
        const activeOnly = url.searchParams.get("active") === "true";
        const limit = parseInt(url.searchParams.get("limit") || "10");

        // Construct query for user blocks information
        let query = supabaseServer
            .from("user_blocks")
            .select("block_reason, blocked_at, unblocked_at, block_duration_minutes, is_active, created_at")
            .eq("telegram_id", parseInt(telegramId))
            .order("created_at", { ascending: false })
            .limit(Math.min(limit, 50)); // Cap limit at 50 for security

        // Apply active filter if requested
        if (activeOnly) {
            query = query.eq("is_active", true);
        }

        const { data: blocks, error } = await query;

        if (error) {
            console.error("Error retrieving user blocks:", error);
            return NextResponse.json(
                {
                    success: false,
                    error: "Failed to retrieve user blocks",
                    message: error.message,
                },
                { status: 500 },
            );
        }

        // Extract most recent active block reason if available
        const activeBlock = blocks?.find(block => block.is_active);
        const mostRecentBlockReason = activeBlock?.block_reason || null;

        console.log(`User blocks retrieved for user ${telegramId}: ${blocks?.length || 0} records`);

        return NextResponse.json({
            success: true,
            blocks: blocks || [],
            activeBlockReason: mostRecentBlockReason,
            totalCount: blocks?.length || 0,
        });
    } catch (error) {
        console.error("User blocks API error:", error);

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