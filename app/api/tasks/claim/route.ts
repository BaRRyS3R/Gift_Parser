// src/app/api/tasks/claim/route.ts - Защищенный доступ для получения наград

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { userService, supabase } from "@/lib/supabase";

export const POST = withAuth(async (request) => {
    console.log("=== TASKS/CLAIM API START ===");

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
                is_active: userData.is_active,
                attempts_remaining: userData.attempts_remaining
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

            // Try to find by UUID as fallback
            console.log("Attempting to find user by userId:", user.userId);
            try {
                const { data: userByUuid, error: uuidError } = await supabase
                    .from("users")
                    .select("*")
                    .eq("id", user.userId)
                    .single();

                if (uuidError) {
                    console.log("User not found by UUID either:", uuidError.message);
                } else if (userByUuid) {
                    console.log("Found user by UUID but telegram_id mismatch:", {
                        storedTelegramId: userByUuid.telegram_id,
                        requestTelegramId: user.telegramId
                    });

                    // Use the user found by UUID
                    userData = userByUuid;
                } else {
                    console.log("No user found by UUID");
                }
            } catch (uuidError) {
                console.error("Error checking user by UUID:", uuidError);
            }
        }

        if (!userData) {
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

        // Use the database function to claim reward safely
        console.log("Claiming task reward using database function:", {
            userId: userData.id,
            taskId: taskId
        });

        try {
            console.log("Calling database function claim_task_reward...");
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

                // Handle specific errors from database function
                if (result.error.includes("Completed task not found")) {
                    return NextResponse.json(
                        { success: false, error: "Task not completed or already claimed" },
                        { status: 400 },
                    );
                }

                if (result.error.includes("Task not found")) {
                    return NextResponse.json(
                        { success: false, error: "Task not found" },
                        { status: 404 },
                    );
                }

                return NextResponse.json(
                    { success: false, error: result.error },
                    { status: 500 },
                );
            }

            console.log("Task reward claimed successfully:", {
                completion: result.task_completion,
                reward: result.reward_attempts,
                newTotal: result.new_attempts_total
            });

            // Return the result in the expected format
            const claimResult = {
                completion: result.task_completion,
                reward: result.reward_attempts,
            };

            return NextResponse.json({
                success: true,
                result: claimResult,
            });

        } catch (taskError) {
            console.error("ERROR IN DATABASE FUNCTION:", taskError);
            console.error("Task error details:", {
                message: taskError instanceof Error ? taskError.message : 'Unknown error',
                stack: taskError instanceof Error ? taskError.stack : undefined,
                name: taskError instanceof Error ? taskError.name : undefined
            });

            // Handle connection errors
            if (taskError instanceof Error && (taskError.message.includes("connect") || taskError.message.includes("timeout"))) {
                return NextResponse.json(
                    { success: false, error: "Database connection error" },
                    { status: 503 },
                );
            }

            // Return the specific error message
            return NextResponse.json(
                { success: false, error: taskError instanceof Error ? taskError.message : "Failed to claim task reward" },
                { status: 500 },
            );
        }

    } catch (error) {
        console.error("UNEXPECTED ERROR IN TASKS/CLAIM:", error);
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
        console.log("=== TASKS/CLAIM API END ===");
    }
});