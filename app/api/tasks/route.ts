// src/app/api/tasks/route.ts - Corrected version

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";
import { taskService } from "@/lib/supabase_tasks";
import { supabase } from "@/lib/supabase"; // Import supabase client directly

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

            // Check if user exists with different ID using direct supabase client
            console.log("Checking if user exists with userId:", user.userId);
            try {
                const { data: userByUuid } = await supabase
                    .from("users")
                    .select("*")
                    .eq("id", user.userId)
                    .single();

                if (userByUuid) {
                    console.log("User found by UUID but telegram_id mismatch:", {
                        storedTelegramId: userByUuid.telegram_id,
                        requestTelegramId: user.telegramId
                    });
                }
            } catch (uuidError) {
                console.log("User not found by UUID either");
            }

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