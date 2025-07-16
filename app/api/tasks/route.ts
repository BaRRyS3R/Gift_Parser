// src/app/api/tasks/route.ts - Main tasks endpoint

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";
import { taskService } from "@/lib/supabase_tasks";

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;

        // Get user data to ensure user exists
        const userData = await userService.findByTelegramId(user.telegramId);

        if (!userData) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 },
            );
        }

        // Get tasks for user
        const tasks = await taskService.getTasksForUser(userData.id);

        return NextResponse.json({
            success: true,
            tasks,
        });
    } catch (error) {
        console.error("Error fetching tasks:", error);

        return NextResponse.json(
            { success: false, error: "Failed to fetch tasks" },
            { status: 500 },
        );
    }
});