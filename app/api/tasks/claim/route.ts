// src/app/api/tasks/claim/route.ts - Claim task reward endpoint

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

        // Claim task reward
        const result = await taskService.claimTaskReward(
            userData.id,
            taskId,
            userData.telegram_id,
        );

        return NextResponse.json({
            success: true,
            result,
        });
    } catch (error) {
        console.error("Error claiming task reward:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to claim task reward"
            },
            { status: 500 },
        );
    }
});