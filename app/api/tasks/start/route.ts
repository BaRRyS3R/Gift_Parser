// src/app/api/tasks/start/route.ts - Fixed version with better error handling

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";
import { taskService } from "@/lib/supabase_tasks";

export const POST = withAuth(async (request) => {
    try {
        const { user } = request;

        // Safely parse request body
        let requestBody;
        try {
            requestBody = await request.json();
        } catch (error) {
            console.error("Error parsing request body:", error);
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

        // Validate taskId format (should be UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(taskId)) {
            return NextResponse.json(
                { success: false, error: "Invalid task ID format" },
                { status: 400 },
            );
        }

        // Get user data
        let userData;
        try {
            userData = await userService.findByTelegramId(user.telegramId);
        } catch (error) {
            console.error("Error fetching user data:", error);
            return NextResponse.json(
                { success: false, error: "Failed to fetch user data" },
                { status: 500 },
            );
        }

        if (!userData) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 },
            );
        }

        // Start task with detailed error handling
        try {
            const taskCompletion = await taskService.startTask(userData.id, taskId);

            return NextResponse.json({
                success: true,
                taskCompletion,
            });

        } catch (taskError) {
            console.error("Error starting task:", taskError);

            // Handle specific task service errors
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

                // Handle Supabase/database errors
                if (taskError.message.includes("duplicate key value")) {
                    return NextResponse.json(
                        { success: false, error: "Task already started" },
                        { status: 409 },
                    );
                }

                // Handle database connection errors
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
                { success: false, error: "Failed to start task" },
                { status: 500 },
            );
        }

    } catch (error) {
        console.error("Unexpected error in tasks/start:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to start task"
            },
            { status: 500 },
        );
    }
});