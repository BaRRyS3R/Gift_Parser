// src/app/api/tasks/complete/route.ts - Публичный доступ для завершения заданий

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractTokenFromHeaders, verifyToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
    console.log("=== TASKS/COMPLETE API START ===");

    try {
        // Парсим тело запроса
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

        const { taskId, telegramId } = requestBody;

        if (!taskId) {
            return NextResponse.json(
                { success: false, error: "Task ID is required" },
                { status: 400 },
            );
        }

        // Проверяем формат UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(taskId)) {
            return NextResponse.json(
                { success: false, error: "Invalid task ID format" },
                { status: 400 },
            );
        }

        // Проверяем авторизацию
        const authHeader = request.headers.get("authorization");
        let userId: string | null = null;
        let userTelegramId: number | null = null;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            try {
                const validation = await verifyToken(token);
                if (validation.isValid && validation.payload) {
                    // Находим пользователя по telegram_id
                    const { data: userData } = await supabase
                        .from("users")
                        .select("id, telegram_id, is_active")
                        .eq("telegram_id", validation.payload.telegramId)
                        .single();

                    if (userData && userData.is_active) {
                        userId = userData.id;
                        userTelegramId = userData.telegram_id;
                        console.log("User authenticated:", {
                            userId: userData.id,
                            telegramId: userData.telegram_id
                        });
                    }
                }
            } catch (error) {
                console.log("Token validation failed:", error);
            }
        }

        // Если пользователь не авторизован, но передан telegramId, пытаемся найти пользователя
        if (!userId && telegramId) {
            console.log("Trying to find user by provided telegramId:", telegramId);
            const { data: userData } = await supabase
                .from("users")
                .select("id, telegram_id, is_active")
                .eq("telegram_id", telegramId)
                .single();

            if (userData && userData.is_active) {
                userId = userData.id;
                userTelegramId = userData.telegram_id;
                console.log("User found by telegramId:", {
                    userId: userData.id,
                    telegramId: userData.telegram_id
                });
            }
        }

        // Если пользователь не найден, возвращаем ошибку
        if (!userId) {
            console.log("No user found for task completion");
            return NextResponse.json(
                {
                    success: false,
                    error: "User authentication required for task completion",
                    requiresAuth: true
                },
                { status: 401 },
            );
        }

        // Получаем информацию о задаче
        const { data: task, error: taskError } = await supabase
            .from("tasks")
            .select("*")
            .eq("id", taskId)
            .eq("is_active", true)
            .single();

        if (taskError || !task) {
            console.error("Task not found or inactive:", taskError);
            return NextResponse.json(
                { success: false, error: "Task not found or inactive" },
                { status: 404 },
            );
        }

        // Находим начатое выполнение задачи
        const { data: existingCompletion, error: completionError } = await supabase
            .from("user_task_completions")
            .select("*")
            .eq("user_id", userId)
            .eq("task_id", taskId)
            .eq("status", "started")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (completionError || !existingCompletion) {
            console.error("Started task completion not found:", completionError);
            return NextResponse.json(
                { success: false, error: "Task not started or already completed" },
                { status: 400 },
            );
        }

        // Проверяем выполнение задачи (для telegram каналов)
        if (task.type === "telegram_channel" || task.type === "telegram_chat") {
            if (task.telegram_id && userTelegramId) {
                try {
                    const membershipResponse = await fetch(`${request.nextUrl.origin}/api/check-telegram-membership`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            chat_id: task.telegram_id,
                            user_id: userTelegramId,
                        }),
                    });

                    const membershipResult = await membershipResponse.json();

                    if (!membershipResult.is_member) {
                        console.log("User is not a member of the required channel/chat");
                        return NextResponse.json(
                            { success: false, error: "Task verification failed" },
                            { status: 400 },
                        );
                    }
                } catch (membershipError) {
                    console.error("Error checking telegram membership:", membershipError);
                    return NextResponse.json(
                        { success: false, error: "Failed to verify task completion" },
                        { status: 500 },
                    );
                }
            }
        }

        // Обновляем статус выполнения на completed
        const { data: updatedCompletion, error: updateError } = await supabase
            .from("user_task_completions")
            .update({
                status: "completed",
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", existingCompletion.id)
            .select()
            .single();

        if (updateError) {
            console.error("Error updating task completion:", updateError);
            return NextResponse.json(
                { success: false, error: "Failed to complete task" },
                { status: 500 },
            );
        }

        console.log("Task completed successfully:", updatedCompletion);

        return NextResponse.json({
            success: true,
            taskCompletion: updatedCompletion,
        });

    } catch (error) {
        console.error("Unexpected error in tasks/complete:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Internal server error"
            },
            { status: 500 },
        );
    } finally {
        console.log("=== TASKS/COMPLETE API END ===");
    }
}