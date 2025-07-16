// src/app/api/tasks/start/route.ts - Start task endpoint

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";
import { taskService } from "@/lib/supabase_tasks";

export const POST = withAuth(async (request) => {
    try {
        const { user } = request;
        const { taskId } = await request.json();

        if (!taskId) {
            return NextResponse.json(
                { success: false, error: "Task ID is required" },
                { status: 400 },
            );
        }

        // Get user data
        const userData = await userService.findByTelegramId(user.telegramId);

        if (!userData) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 },
            );
        }

        // Start task
        const taskCompletion = await taskService.startTask(userData.id, taskId);

        return NextResponse.json({
            success: true,
            taskCompletion,
        });
    } catch (error) {
        console.error("Error starting task:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to start task"
            },
            { status: 500 },
        );
    }
});