// src/app/api/tasks/start/route.ts - Публичный доступ для начала заданий

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractTokenFromHeaders, verifyToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
    console.log("=== TASKS/START API START ===");

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

        // Если пользователь не найден, создаем запись как анонимный пользователь
        if (!userId) {
            console.log("No user found, tasks can still be started for demo purposes");
            // Для демонстрации разрешаем начать задание без пользователя
            // В реальном приложении вы можете создать временного пользователя
            return NextResponse.json({
                success: true,
                taskCompletion: {
                    id: `temp_${Date.now()}`,
                    task_id: taskId,
                    status: "started",
                    started_at: new Date().toISOString(),
                    user_id: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                requiresAuth: true,
                message: "Task started in demo mode. Authentication required for rewards.",
            });
        }

        // Проверяем существование и активность задачи
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

        // Проверяем существующие выполнения
        const { data: existingCompletions } = await supabase
            .from("user_task_completions")
            .select("*")
            .eq("user_id", userId)
            .eq("task_id", taskId)
            .order("created_at", { ascending: false });

        const latestCompletion = existingCompletions?.[0];

        // Логика проверки возможности выполнения
        if (latestCompletion) {
            if (task.type === "story_share") {
                if (latestCompletion.status === "claimed" && task.cooldown_minutes) {
                    const lastClaimedAt = new Date(latestCompletion.claimed_at);
                    const cooldownMs = task.cooldown_minutes * 60 * 1000;
                    const nextAvailable = new Date(lastClaimedAt.getTime() + cooldownMs);

                    if (new Date() < nextAvailable) {
                        return NextResponse.json(
                            {
                                success: false,
                                error: "Task is on cooldown",
                                next_available_at: nextAvailable.toISOString()
                            },
                            { status: 429 },
                        );
                    }
                }
            } else {
                // Для остальных заданий - только одно выполнение
                if (latestCompletion.status === "claimed") {
                    return NextResponse.json(
                        { success: false, error: "Task already completed" },
                        { status: 409 },
                    );
                }

                if (latestCompletion.status === "started") {
                    return NextResponse.json(
                        { success: false, error: "Task already started" },
                        { status: 409 },
                    );
                }
            }
        }

        // Создаем новое выполнение задачи
        const { data: newCompletion, error: insertError } = await supabase
            .from("user_task_completions")
            .insert({
                user_id: userId,
                task_id: taskId,
                status: "started",
                started_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error creating task completion:", insertError);
            return NextResponse.json(
                { success: false, error: "Failed to start task" },
                { status: 500 },
            );
        }

        console.log("Task started successfully:", newCompletion);

        return NextResponse.json({
            success: true,
            taskCompletion: newCompletion,
        });

    } catch (error) {
        console.error("Unexpected error in tasks/start:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Internal server error"
            },
            { status: 500 },
        );
    } finally {
        console.log("=== TASKS/START API END ===");
    }
}