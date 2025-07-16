// src/app/api/tasks/route.ts - Гибридный подход с публичным доступом

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { taskService } from "@/lib/supabase_tasks";
import { extractTokenFromHeaders, verifyToken } from "@/lib/jwt";

export async function GET(request: NextRequest) {
    console.log("=== TASKS API GET START ===");

    try {
        // Проверяем наличие токена авторизации
        const authHeader = request.headers.get("authorization");
        let userId: string | null = null;
        let isAuthenticated = false;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            try {
                const validation = await verifyToken(token);
                if (validation.isValid && validation.payload) {
                    // Проверяем существование пользователя
                    const { data: userData } = await supabase
                        .from("users")
                        .select("id, telegram_id, is_active")
                        .eq("telegram_id", validation.payload.telegramId)
                        .single();

                    if (userData && userData.is_active) {
                        userId = userData.id;
                        isAuthenticated = true;
                        console.log("User authenticated:", {
                            userId: userData.id,
                            telegramId: userData.telegram_id
                        });
                    }
                }
            } catch (error) {
                console.log("Token validation failed, continuing as anonymous:", error);
            }
        }

        // Получаем все активные задачи (публично доступно)
        console.log("Fetching active tasks...");
        const { data: tasks, error: tasksError } = await supabase
            .from("tasks")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (tasksError) {
            console.error("Error fetching tasks:", tasksError);
            return NextResponse.json(
                { success: false, error: "Failed to fetch tasks" },
                { status: 500 },
            );
        }

        console.log("Active tasks found:", tasks?.length || 0);

        if (!tasks || tasks.length === 0) {
            return NextResponse.json({
                success: true,
                tasks: [],
                isAuthenticated,
            });
        }

        // Если пользователь авторизован, получаем его выполнения заданий
        let userCompletions: any[] = [];
        if (isAuthenticated && userId) {
            console.log("Fetching user completions for authenticated user...");
            const { data: completions, error: completionsError } = await supabase
                .from("user_task_completions")
                .select("*")
                .eq("user_id", userId);

            if (completionsError) {
                console.error("Error fetching user completions:", completionsError);
                // Продолжаем без выполнений
            } else {
                userCompletions = completions || [];
                console.log("User completions found:", userCompletions.length);
            }
        }

        // Обрабатываем задачи с учетом выполнений пользователя
        const processedTasks = tasks.map((task) => {
            const userTaskCompletions = userCompletions.filter(c => c.task_id === task.id);
            const latestCompletion = userTaskCompletions.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];

            let canComplete = true;
            let nextAvailableAt: string | undefined;

            if (isAuthenticated) {
                // Логика для авторизованных пользователей
                if (task.type === "story_share") {
                    if (task.cooldown_minutes && latestCompletion?.claimed_at) {
                        try {
                            const lastClaimedAt = new Date(latestCompletion.claimed_at);
                            const cooldownMs = task.cooldown_minutes * 60 * 1000;
                            const nextAvailable = new Date(lastClaimedAt.getTime() + cooldownMs);

                            if (new Date() < nextAvailable) {
                                canComplete = false;
                                nextAvailableAt = nextAvailable.toISOString();
                            }
                        } catch (dateError) {
                            console.error("Error processing cooldown for task:", task.id, dateError);
                        }
                    }
                } else {
                    // Для остальных заданий - только одно выполнение
                    if (latestCompletion?.status === "claimed") {
                        canComplete = false;
                    }
                }
            }

            return {
                ...task,
                user_completion: isAuthenticated ? latestCompletion : undefined,
                can_complete: canComplete,
                next_available_at: nextAvailableAt,
            };
        });

        console.log("Processed tasks count:", processedTasks.length);

        return NextResponse.json({
            success: true,
            tasks: processedTasks,
            isAuthenticated,
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
}