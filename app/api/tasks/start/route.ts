// src/app/api/tasks/start/route.ts - Полная авторизация
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { userService, supabase } from "@/lib/supabase";
import { taskService } from "@/lib/supabase_tasks";

export const POST = withAuth(async (request) => {
    console.log("=== TASKS/START API START ===");

    try {
        const { user } = request;
        console.log("Authenticated user:", {
            userId: user.userId,
            telegramId: user.telegramId,
            iat: user.iat,
            exp: user.exp
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
            const taskCompletion = await taskService.startTask(userData.id, taskId);
            return NextResponse.json({
                success: true,
                taskCompletion,
            });
        } catch (taskError) {
            console.error("Error starting task:", taskError);
            if (taskError instanceof Error) {
                if (taskError.message.includes("Task not found or inactive")) {
                    return NextResponse.json(
                        { success: false, error: "Task not found or inactive" },
                        { status: 404 },
                    );
                }
                if (taskError.message.includes("Task already started")) {
                    return NextResponse.json(
                        { success: false, error: "Task already started" },
                        { status: 409 },
                    );
                }
                if (taskError.message.includes("Task already completed")) {
                    return NextResponse.json(
                        { success: false, error: "Task already completed" },
                        { status: 409 },
                    );
                }
                if (taskError.message.includes("Task is on cooldown")) {
                    return NextResponse.json(
                        { success: false, error: "Task is on cooldown" },
                        { status: 429 },
                    );
                }
                return NextResponse.json(
                    { success: false, error: taskError.message },
                    { status: 500 },
                );
            }
            return NextResponse.json(
                { success: false, error: "Failed to start task" },
                { status: 500 },
            );
        }
    } catch (error) {
        console.error("Unexpected error in tasks/start:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
        );
    } finally {
        console.log("=== TASKS/START API END ===");
    }
});