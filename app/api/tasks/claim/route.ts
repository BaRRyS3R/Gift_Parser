// src/app/api/tasks/claim/route.ts - Полная авторизация (уже создан ранее, но повторяю для полноты)
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { userService, supabase } from "@/lib/supabase";

export const POST = withAuth(async (request) => {
    console.log("=== TASKS/CLAIM API START ===");

    try {
        const { user } = request;
        console.log("Authenticated user:", {
            userId: user.userId,
            telegramId: user.telegramId
        });

        if (!user.userId || !user.telegramId) {
            return NextResponse.json(
                { success: false, error: "Invalid authentication payload" },
                { status: 401 },
            );
        }

        let requestBody;
        try {
            requestBody = await request.json();
        } catch (error) {
            return NextResponse.json(
                { success: false, error: "Invalid request body" },
                { status: 400 },
            );
        }

        const { taskId } = requestBody;
        if (!taskId) {
            return NextResponse.json(
                { success: false, error: "Task ID is required" },
                { status: 400 },
            );
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(taskId)) {
            return NextResponse.json(
                { success: false, error: "Invalid task ID format" },
                { status: 400 },
            );
        }

        // Get user data with fallback
        let userData = await userService.findByTelegramId(user.telegramId);
        if (!userData) {
            const { data: userByUuid } = await supabase
                .from("users")
                .select("*")
                .eq("id", user.userId)
                .single();
            userData = userByUuid;
        }

        if (!userData) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 },
            );
        }

        if (!userData.is_active) {
            return NextResponse.json(
                { success: false, error: "User account is inactive" },
                { status: 403 },
            );
        }

        try {
            const { data, error } = await supabase.rpc('claim_task_reward', {
                p_user_id: userData.id,
                p_task_id: taskId
            });

            if (error) {
                console.error("Database function error:", error);
                return NextResponse.json(
                    { success: false, error: "Database error occurred" },
                    { status: 503 },
                );
            }

            const result = typeof data === 'string' ? JSON.parse(data) : data;

            if (!result.success) {
                console.error("Function returned error:", result.error);
                if (result.error.includes("Completed task not found")) {
                    return NextResponse.json(
                        { success: false, error: "Task not completed or already claimed" },
                        { status: 400 },
                    );
                }
                return NextResponse.json(
                    { success: false, error: result.error },
                    { status: 500 },
                );
            }

            const claimResult = {
                completion: result.task_completion,
                reward: result.reward_attempts,
            };

            return NextResponse.json({
                success: true,
                result: claimResult,
            });

        } catch (taskError) {
            console.error("Error claiming task reward:", taskError);
            return NextResponse.json(
                { success: false, error: "Failed to claim task reward" },
                { status: 500 },
            );
        }
    } catch (error) {
        console.error("Unexpected error in tasks/claim:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
        );
    } finally {
        console.log("=== TASKS/CLAIM API END ===");
    }
});