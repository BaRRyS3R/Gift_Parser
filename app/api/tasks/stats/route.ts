// src/app/api/tasks/start/route.ts - Debug version

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";
import { taskService } from "@/lib/supabase_tasks";

export const POST = withAuth(async (request) => {
    console.log("=== TASKS/START API DEBUG START ===");

    try {
        const { user } = request;
        console.log("Authenticated user:", {
            userId: user.userId,
            telegramId: user.telegramId,
            iat: user.iat,
            exp: user.exp
        });

        // Safely parse request body
        let requestBody;
        try {
            requestBody = await request.json();
            console.log("Request body parsed:", requestBody);
        } catch (error) {
            console.error("Error parsing request body:", error);
            return NextResponse.json(
                { success: false, error: "Invalid request body" },
                { status: 400 },
            );
        }

        const { taskId } = requestBody;
        console.log("Task ID from request:", taskId);

        if (!taskId) {
            console.error("Task ID is missing");
            return NextResponse.json(
                { success: false, error: "Task ID is required" },
                { status: 400 },
            );
        }

        // Validate taskId format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(taskId)) {
            console.error("Invalid task ID format:", taskId);
            return NextResponse.json(
                { success: false, error: "Invalid task ID format" },
                { status: 400 },
            );
        }

        // Get user data
        console.log("Fetching user data for telegram_id:", user.telegramId);
        let userData;
        try {
            userData = await userService.findByTelegramId(user.telegramId);
            console.log("User data fetched:", userData ? {
                id: userData.id,
                telegram_id: userData.telegram_id,
                first_name: userData.first_name
            } : "null");
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

        // Start task with detailed logging
        console.log("Starting task with params:", {
            userId: userData.id,
            taskId: taskId
        });

        try {
            console.log("Calling taskService.startTask...");
            const taskCompletion = await taskService.startTask(userData.id, taskId);
            console.log("Task started successfully:", taskCompletion);

            return NextResponse.json({
                success: true,
                taskCompletion,
            });

        } catch (taskError) {
            console.error("ERROR IN TASK SERVICE:", taskError);
            console.error("Task error details:", {
                message: taskError instanceof Error ? taskError.message : 'Unknown error',
                stack: taskError instanceof Error ? taskError.stack : undefined,
                name: taskError instanceof Error ? taskError.name : undefined
            });

            // Handle specific errors
            if (taskError instanceof Error) {
                if (taskError.message === "Task not found") {
                    return NextResponse.json(
                        { success: false, error: "Task not found" },
                        { status: 404 },
                    );
                }

                if (taskError.message === "Task cannot be completed at this time") {
                    return NextResponse.json(
                        { success: false, error: "Task cannot be completed at this time" },
                        { status: 400 },
                    );
                }

                if (taskError.message.includes("duplicate key value")) {
                    return NextResponse.json(
                        { success: false, error: "Task already started" },
                        { status: 409 },
                    );
                }
            }

            return NextResponse.json(
                {
                    success: false,
                    error: taskError instanceof Error ? taskError.message : "Failed to start task",
                    debug: {
                        errorType: taskError instanceof Error ? taskError.name : typeof taskError,
                        errorMessage: taskError instanceof Error ? taskError.message : String(taskError)
                    }
                },
                { status: 500 },
            );
        }

    } catch (error) {
        console.error("UNEXPECTED ERROR IN TASKS/START:", error);
        console.error("Error details:", {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
        });

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
                debug: {
                    errorType: error instanceof Error ? error.name : typeof error,
                    errorMessage: error instanceof Error ? error.message : String(error)
                }
            },
            { status: 500 },
        );
    } finally {
        console.log("=== TASKS/START API DEBUG END ===");
    }
});