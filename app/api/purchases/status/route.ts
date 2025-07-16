// src/app/api/purchases/status/route.ts - Production purchase status check

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;

        // Get updated user data from database
        const userData = await userService.findByTelegramId(user.telegramId);

        if (!userData) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 },
            );
        }

        // Check if there are any recent purchases by looking at updated_at timestamp
        // This serves as a cache invalidation signal for the frontend
        const lastUpdate = userData.updated_at ? new Date(userData.updated_at) : new Date(0);
        const timeSinceUpdate = Date.now() - lastUpdate.getTime();

        // If user data was updated recently (within last 5 minutes), 
        // it's likely due to a purchase webhook processing
        const hasRecentUpdate = timeSinceUpdate < 5 * 60 * 1000; // 5 minutes

        // Return current user status
        return NextResponse.json({
            success: true,
            status: "checked",
            message: "Purchase status verified successfully",
            user: {
                telegram_id: userData.telegram_id,
                attempts_remaining: userData.attempts_remaining,
                total_games: userData.total_games,
                last_updated: userData.updated_at,
                has_recent_update: hasRecentUpdate,
            },
            cache_invalidate: hasRecentUpdate, // Signal frontend to refresh cache
        });

    } catch (error) {
        console.error("Error checking purchase status:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to check purchase status"
            },
            { status: 500 },
        );
    }
});