// src/app/api/tasks/route.ts - Полная авторизация с исправлениями

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { userService, supabase } from "@/lib/supabase";
import { taskService } from "@/lib/supabase_tasks";

export const GET = withAuth(async (request) => {
    console.log("=== TASKS API GET START ===");
    console.log("Request URL:", request.url);
    console.log("Request headers:", Object.fromEntries(request.headers.entries()));

    try {
        const { user } = request;
        console.log("Authenticated user payload:", {
            userId: user.userId,
            telegramId: user.telegramId,
            iat: user.iat,
            exp: user.exp,
            tokenAge: Date.now() / 1000 - user.iat
        });

        // Validate user payload
        if (!user.userId || !user.telegramId) {
            console.error("Invalid user payload:", user);
            return NextResponse.json(
                { success: false, error: "Invalid authentication payload" },
                { status: 401 },
            );
        }

        // Check token expiration
        const currentTime = Math.floor(Date.now() / 1000);
        if (user.exp && currentTime > user.exp) {
            console.error("Token expired:", { exp: user.exp, current: currentTime });
            return NextResponse.json(
                { success: false, error: "Token expired" },
                { status: 401 },
            );
        }

        // Primary: Get user data by telegram_id
        console.log("Looking up user by telegram_id:", user.telegramId);
        let userData;
        try {
            userData = await userService.findByTelegramId(user.telegramId);
            console.log("User lookup by telegram_id result:", userData ? {
                id: userData.id,
                telegram_id: userData.telegram_id,
                first_name: userData.first_name,
                is_active: userData.is_active
            } : "null");
        } catch (dbError) {
            console.error("Database error during user lookup by telegram_id:", dbError);
            return NextResponse.json(
                { success: false, error: "Database connection error" },
                { status: 503 },
            );
        }

        // Fallback: Try to find user by UUID
        if (!userData) {
            console.log("User not found by telegram_id, trying UUID lookup...");
            try {
                const { data: userByUuid, error: uuidError } = await supabase
                    .from("users")
                    .select("*")
                    .eq("id", user.userId)
                    .single();

                if (uuidError) {
                    console.error("UUID lookup error:", uuidError.message);
                } else if (userByUuid) {
                    console.log("Found user by UUID:", {
                        id: userByUuid.id,
                        telegram_id: userByUuid.telegram_id,
                        storedTelegramId: userByUuid.telegram_id,
                        requestTelegramId: user.telegramId
                    });
                    
                    // Use the user found by UUID regardless of telegram_id mismatch
                    // This handles cases where JWT was created with different telegram_id
                    userData = userByUuid;
                    console.log("Using user found by UUID, telegram_id mismatch will be ignored");
                } else {
                    console.log("No user found by UUID either");
                }
            } catch (uuidError) {
                console.error("Error during UUID lookup:", uuidError);
                return NextResponse.json(
                    { success: false, error: "Database error during user verification" },
                    { status: 503 },
                );
            }
        }

        // Additional fallback: Search by different combinations
        if (!userData) {
            console.log("Attempting broader user search...");
            try {
                // Try to find any user with similar characteristics
                const { data: users, error: searchError } = await supabase
                    .from("users")
                    .select("*")
                    .or(`id.eq.${user.userId},telegram_id.eq.${user.telegramId}`)
                    .limit(5);

                if (searchError) {
                    console.error("Search error:", searchError);
                } else {
                    console.log("Found users in broader search:", users?.map(u => ({ 
                        id: u.id, 
                        telegram_id: u.telegram_id,
                        first_name: u.first_name 
                    })));
                    
                    if (users && users.length > 0) {
                        userData = users[0]; // Use the first match
                        console.log("Using first user from broader search");
                    }
                }
            } catch (searchError) {
                console.error("Error during broader search:", searchError);
            }
        }

        if (!userData) {
            console.error("User not found in database after all attempts");
            console.log("Debug info:", {
                requestedTelegramId: user.telegramId,
                requestedUserId: user.userId,
                tokenIat: user.iat,
                tokenExp: user.exp
            });
            
            return NextResponse.json(
                { 
                    success: false, 
                    error: "User not found",
                    debug: process.env.NODE_ENV === 'development' ? {
                        requestedTelegramId: user.telegramId,
                        requestedUserId: user.userId,
                        tokenAge: currentTime - user.iat
                    } : undefined
                },
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
            console.error("Task error details:", {
                message: taskError instanceof Error ? taskError.message : String(taskError),
                stack: taskError instanceof Error ? taskError.stack : undefined
            });
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
            userInfo: {
                id: userData.id,
                telegram_id: userData.telegram_id,
                first_name: userData.first_name
            }
        });

    } catch (error) {
        console.error("Unexpected error in tasks API:", error);
        console.error("Error stack:", error instanceof Error ? error.stack : undefined);
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