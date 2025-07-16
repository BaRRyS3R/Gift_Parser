// src/app/api/tasks/complete/route.ts - Исправленная версия

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";
import { taskService } from "@/lib/supabase_tasks";

export const POST = withAuth(async (request) => {
    console.log("=== TASKS/COMPLETE API START ===");

    try {
        const { user } = request;
        console.log("Authenticated user:", {
            userId: user.userId,
            telegramId: user.telegramId,
            iat: user.iat,
            exp: user.exp
        });

        // Validate user payload
        if (!user.userId || !user.telegramId) {
            console.error("Invalid user payload:", user);
            return NextResponse.json(
                { success: false, error: "Invalid authentication payload" },
                { status: 401 },
            );
        }

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
                first_name: userData.first_name,
                is_active: userData.is_active
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

        // Check if user is active
        if (!userData.is_active) {
            console.error("User account is inactive:", userData.id);
            return NextResponse.json(
                { success: false, error: "User account is inactive" },
                { status: 403 },
            );
        }

        // Check task completion first (for telegram tasks)
        console.log("Checking task completion...");
        try {
            const isCompleted = await taskService.checkTaskCompletion(
                userData.id,
                taskId,
                userData.telegram_id,
            );

            if (!isCompleted) {
                console.log("Task completion check failed");
                return NextResponse.json(
                    { success: false, error: "Task verification failed" },
                    { status: 400 },
                );
            }

            console.log("Task completion check passed");
        } catch (checkError) {
            console.error("Error checking task completion:", checkError);
            return NextResponse.json(
                { success: false, error: "Failed to verify task completion" },
                { status: 500 },
            );
        }

        // Complete task using the new database function
        console.log("Completing task with params:", {
            userId: userData.id,
            taskId: taskId
        });

        try {
            console.log("Calling taskService.completeTask...");
            const taskCompletion = await taskService.completeTask(userData.id, taskId);
            console.log("Task completed successfully:", taskCompletion);

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

            // Handle specific errors from database functions
            if (taskError instanceof Error) {
                if (taskError.message.includes("Task completion not found or not started")) {
                    return NextResponse.json(
                        { success: false, error: "Task not started or already completed" },
                        { status: 400 },
                    );
                }

                if (taskError.message.includes("Database function error")) {
                    return NextResponse.json(
                        { success: false, error: "Database error occurred" },
                        { status: 503 },
                    );
                }

                // Handle connection errors
                if (taskError.message.includes("connect") || taskError.message.includes("timeout")) {
                    return NextResponse.json(
                        { success: false, error: "Database connection error" },
                        { status: 503 },
                    );
                }

                // Return the specific error message
                return NextResponse.json(
                    { success: false, error: taskError.message },
                    { status: 500 },
                );
            }

            // Fallback for non-Error objects
            return NextResponse.json(
                { success: false, error: "Failed to complete task" },
                { status: 500 },
            );
        }

    } catch (error) {
        console.error("UNEXPECTED ERROR IN TASKS/COMPLETE:", error);
        console.error("Error details:", {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
        });

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
                debug: process.env.NODE_ENV === 'development' ? {
                    errorType: error instanceof Error ? error.name : typeof error,
                    errorMessage: error instanceof Error ? error.message : String(error)
                } : undefined
            },
            { status: 500 },
        );
    } finally {
        console.log("=== TASKS/COMPLETE API END ===");
    }
});