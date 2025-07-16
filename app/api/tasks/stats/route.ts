// src/app/api/tasks/stats/route.ts - Дополнительный endpoint для статистики заданий

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";
import { taskService } from "@/lib/supabase_tasks";

export const GET = withAuth(async (request) => {
    console.log("=== TASKS/STATS API START ===");

    try {
        const { user } = request;
        console.log("Authenticated user:", {
            userId: user.userId,
            telegramId: user.telegramId
        });

        // Validate user payload
        if (!user.userId || !user.telegramId) {
            console.error("Invalid user payload:", user);
            return NextResponse.json(
                { success: false, error: "Invalid authentication payload" },
                { status: 401 },
            );
        }

        // Get user data
        console.log("Fetching user data for telegram_id:", user.telegramId);
        let userData;
        try {
            userData = await userService.findByTelegramId(user.telegramId);
        } catch (error) {
            console.error("Error fetching user data:", error);
            return NextResponse.json(
                { success: false, error: "Failed to fetch user data" },
                { status: 500 },
            );
        }

        if (!userData) {
            console.error("User not found in database");
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 },
            );
        }

        // Get task statistics
        console.log("Fetching task statistics for user:", userData.id);
        try {
            const stats = await taskService.getUserTaskStats(userData.id);
            console.log("Task statistics fetched successfully:", stats);

            return NextResponse.json({
                success: true,
                stats,
            });

        } catch (statsError) {
            console.error("Error fetching task statistics:", statsError);
            return NextResponse.json(
                { success: false, error: "Failed to fetch task statistics" },
                { status: 500 },
            );
        }

    } catch (error) {
        console.error("Unexpected error in tasks/stats:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Internal server error"
            },
            { status: 500 },
        );
    } finally {
        console.log("=== TASKS/STATS API END ===");
    }
});