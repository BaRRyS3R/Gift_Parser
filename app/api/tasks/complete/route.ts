// src/app/api/tasks/complete/route.ts - Complete task endpoint

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

        // Check task completion
        const isCompleted = await taskService.checkTaskCompletion(
            userData.id,
            taskId,
            userData.telegram_id,
        );

        if (!isCompleted) {
            return NextResponse.json(
                { success: false, error: "Task not completed" },
                { status: 400 },
            );
        }

        // Complete task
        const taskCompletion = await taskService.completeTask(userData.id, taskId);

        return NextResponse.json({
            success: true,
            taskCompletion,
        });
    } catch (error) {
        console.error("Error completing task:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to complete task"
            },
            { status: 500 },
        );
    }
});