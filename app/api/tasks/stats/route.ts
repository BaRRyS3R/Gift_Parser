// src/app/api/tasks/stats/route.ts - Task statistics endpoint

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";
import { taskService } from "@/lib/supabase_tasks";

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;

        // Get user data
        const userData = await userService.findByTelegramId(user.telegramId);

        if (!userData) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 },
            );
        }

        // Get task statistics
        const stats = await taskService.getUserTaskStats(userData.id);

        return NextResponse.json({
            success: true,
            stats,
        });
    } catch (error) {
        console.error("Error fetching task stats:", error);

        return NextResponse.json(
            { success: false, error: "Failed to fetch task statistics" },
            { status: 500 },
        );
    }
});