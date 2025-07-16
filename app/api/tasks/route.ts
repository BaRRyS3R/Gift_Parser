// src/app/api/tasks/route.ts - Исправленная версия

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { userService, supabase } from "@/lib/supabase";
import { taskService } from "@/lib/supabase_tasks";

export const GET = withAuth(async (request) => {
    console.log("=== TASKS API GET START ===");

    try {
        const { user } = request;
        console.log("Authenticated user payload:", {
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

        // Get user data from database
        console.log("Looking up user by telegram_id:", user.telegramId);
        let userData;
        try {
            userData = await userService.findByTelegramId(user.telegramId);
            console.log("User lookup result:", userData ? {
                id: userData.id,
                telegram_id: userData.telegram_id,
                first_name: userData.first_name,
                is_active: userData.is_active
            } : "null");
        } catch (dbError) {
            console.error("Database error during user lookup:", dbError);
            return NextResponse.json(
                { success: false, error: "Database connection error" },
                { status: 503 },
            );
        }

        if (!userData) {
            console.error("User not found in database for telegram_id:", user.telegramId);
            console.log("Attempting to find user by userId:", user.userId);

            // Try to find by UUID as fallback
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

        // Get tasks for user
        console.log("Fetching tasks for user:", userData.id);
        let tasks;
        try {
            tasks = await taskService.getTasksForUser(userData.id);
            console.log("Tasks fetched successfully. Count:", tasks.length);
        } catch (taskError) {
            console.error("Error fetching tasks:", taskError);
            return NextResponse.json(
                { success: false, error: "Failed to fetch tasks" },
                { status: 500 },
            );
        }

        // Return successful response
        console.log("Returning tasks response");
        return NextResponse.json({
            success: true,
            tasks,
        });

    } catch (error) {
        console.error("Unexpected error in tasks API:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
                debug: process.env.NODE_ENV === 'development' ? {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                } : undefined
            },
            { status: 500 },
        );
    } finally {
        console.log("=== TASKS API GET END ===");
    }
});