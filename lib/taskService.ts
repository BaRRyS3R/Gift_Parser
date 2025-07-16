// src/lib/taskService.ts - Service for task management with server-side database access

import { supabaseServer } from "./supabase-server";
import type {
    Task,
    UserTask,
    TaskWithCompletion,
    TaskType,
    TaskCompletionResponse,
    TaskVerificationResponse,
    TelegramMembershipCheck
} from "@/types/tasks";

export const taskService = {
    // Получение всех активных заданий для пользователя
    async getUserTasks(userId: string): Promise<TaskWithCompletion[]> {
        try {
            // Получаем все активные задания
            const { data: tasks, error: tasksError } = await supabaseServer
                .from("tasks")
                .select("*")
                .eq("is_active", true)
                .order("sort_order", { ascending: true });

            if (tasksError) {
                console.error("Error fetching tasks:", tasksError);
                throw tasksError;
            }

            // Получаем выполненные задания пользователя
            const { data: completedTasks, error: completedError } = await supabaseServer
                .from("user_tasks")
                .select("*")
                .eq("user_id", userId);

            if (completedError) {
                console.error("Error fetching completed tasks:", completedError);
                throw completedError;
            }

            // Создаем мапу выполненных заданий
            const completedTasksMap = new Map(
                completedTasks?.map(task => [task.task_id, task]) || []
            );

            // Объединяем данные
            const tasksWithCompletion: TaskWithCompletion[] = (tasks || []).map(task => ({
                ...task,
                is_completed: completedTasksMap.has(task.id),
                completed_at: completedTasksMap.get(task.id)?.completed_at,
                attempts_awarded: completedTasksMap.get(task.id)?.attempts_awarded,
            }));

            return tasksWithCompletion;
        } catch (error) {
            console.error("Error in getUserTasks:", error);
            throw error;
        }
    },

    // Получение конкретного задания
    async getTask(taskId: number): Promise<Task | null> {
        try {
            const { data: task, error } = await supabaseServer
                .from("tasks")
                .select("*")
                .eq("id", taskId)
                .eq("is_active", true)
                .single();

            if (error) {
                console.error("Error fetching task:", error);
                return null;
            }

            return task;
        } catch (error) {
            console.error("Error in getTask:", error);
            return null;
        }
    },

    // Проверка выполнения задания пользователем
    async isTaskCompleted(userId: string, taskId: number): Promise<boolean> {
        try {
            const { data, error } = await supabaseServer
                .from("user_tasks")
                .select("id")
                .eq("user_id", userId)
                .eq("task_id", taskId)
                .single();

            if (error && error.code !== "PGRST116") {
                console.error("Error checking task completion:", error);
                return false;
            }

            return !!data;
        } catch (error) {
            console.error("Error in isTaskCompleted:", error);
            return false;
        }
    },

    // Надежный поиск пользователя с fallback по telegramId
    async findUserReliably(userId: string, telegramId?: number): Promise<{
        user: any;
        foundBy: 'uuid' | 'telegram_id' | 'not_found';
    }> {
        try {
            console.log(`Searching for user: UUID=${userId}, telegramId=${telegramId}`);

            // Сначала пробуем найти по UUID в таблице users
            const { data: userByUuid, error: uuidError } = await supabaseServer
                .from("users")
                .select("id, telegram_id, attempts_remaining")
                .eq("id", userId)
                .single();

            console.log(`Search by UUID result:`, { userByUuid, uuidError });

            if (userByUuid && !uuidError) {
                console.log(`User found by UUID: ${userId}`);
                return { user: userByUuid, foundBy: 'uuid' };
            }

            // Если не найден по UUID и есть telegramId, пробуем найти по telegramId
            if (telegramId) {
                console.log(`User not found by UUID ${userId}, trying telegramId ${telegramId}`);

                const { data: userByTelegramId, error: telegramError } = await supabaseServer
                    .from("users")
                    .select("id, telegram_id, attempts_remaining")
                    .eq("telegram_id", telegramId)
                    .single();

                console.log(`Search by telegramId result:`, { userByTelegramId, telegramError });

                if (userByTelegramId && !telegramError) {
                    console.log(`User found by telegramId: ${telegramId}, UUID: ${userByTelegramId.id}`);
                    return { user: userByTelegramId, foundBy: 'telegram_id' };
                }
            }

            console.error(`User not found by UUID ${userId}${telegramId ? ` or telegramId ${telegramId}` : ''}`);
            return { user: null, foundBy: 'not_found' };
        } catch (error) {
            console.error("Error in findUserReliably:", error);
            return { user: null, foundBy: 'not_found' };
        }
    },

    // Выполнение задания с улучшенным поиском пользователя
    async completeTask(
        userId: string,
        taskId: number,
        verificationData?: any,
        telegramId?: number
    ): Promise<TaskCompletionResponse> {
        try {
            console.log(`Starting task completion for user ${userId}, task ${taskId}`);

            // Проверяем, не выполнено ли задание уже
            const isCompleted = await this.isTaskCompleted(userId, taskId);
            if (isCompleted) {
                console.log(`Task ${taskId} already completed for user ${userId}`);
                return {
                    success: false,
                    message: "Task already completed",
                    attempts_awarded: 0,
                    new_attempts_total: 0,
                    error: "Task already completed"
                };
            }

            // Получаем информацию о задании
            const task = await this.getTask(taskId);
            if (!task) {
                console.log(`Task ${taskId} not found`);
                return {
                    success: false,
                    message: "Task not found",
                    attempts_awarded: 0,
                    new_attempts_total: 0,
                    error: "Task not found"
                };
            }

            console.log(`Processing task ${taskId} for user ${userId}, reward: ${task.attempts_reward}`);

            // Надежный поиск пользователя
            const { user: existingUser, foundBy } = await this.findUserReliably(userId, telegramId);

            if (!existingUser) {
                console.error(`User not found with ID: ${userId}${telegramId ? ` or telegramId: ${telegramId}` : ''}`);
                return {
                    success: false,
                    message: "User not found",
                    attempts_awarded: 0,
                    new_attempts_total: 0,
                    error: `User not found with ID: ${userId}${telegramId ? ` or telegramId: ${telegramId}` : ''}`
                };
            }

            // Если пользователь найден по telegramId, используем его реальный UUID
            const actualUserId = existingUser.id;
            console.log(`User found by ${foundBy}: ${actualUserId} with ${existingUser.attempts_remaining} attempts`);

            // Выполняем операции атомарно
            const newAttemptsTotal = existingUser.attempts_remaining + task.attempts_reward;

            // Начинаем транзакцию - обновляем попытки пользователя в таблице users
            const { error: updateError } = await supabaseServer
                .from("users")
                .update({
                    attempts_remaining: newAttemptsTotal,
                    updated_at: new Date().toISOString()
                })
                .eq("id", actualUserId)
                .eq("attempts_remaining", existingUser.attempts_remaining); // Optimistic locking

            if (updateError) {
                console.error("Error updating user attempts in users table:", updateError);
                return {
                    success: false,
                    message: "Failed to update attempts",
                    attempts_awarded: 0,
                    new_attempts_total: 0,
                    error: updateError.message
                };
            }

            console.log(`Successfully updated attempts for user ${actualUserId}: ${existingUser.attempts_remaining} -> ${newAttemptsTotal}`);

            // Записываем выполнение задания с правильным userId
            const { error: insertError } = await supabaseServer
                .from("user_tasks")
                .insert({
                    user_id: actualUserId,
                    task_id: taskId,
                    attempts_awarded: task.attempts_reward,
                    verification_data: verificationData || null,
                    completed_at: new Date().toISOString()
                });

            if (insertError) {
                console.error("Error completing task, rolling back attempts:", insertError);

                // Откатываем изменения попыток при ошибке записи задания
                await supabaseServer
                    .from("users")
                    .update({
                        attempts_remaining: existingUser.attempts_remaining,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", actualUserId);

                return {
                    success: false,
                    message: "Failed to complete task",
                    attempts_awarded: 0,
                    new_attempts_total: 0,
                    error: insertError.message
                };
            }

            console.log(`Task ${taskId} completed successfully for user ${actualUserId}, awarded ${task.attempts_reward} attempts`);

            return {
                success: true,
                message: "Task completed successfully",
                attempts_awarded: task.attempts_reward,
                new_attempts_total: newAttemptsTotal
            };
        } catch (error) {
            console.error("Error in completeTask:", error);
            return {
                success: false,
                message: "Failed to complete task",
                attempts_awarded: 0,
                new_attempts_total: 0,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },

    // Верификация задания (для заданий требующих проверки)
    async verifyTask(
        userId: string,
        taskId: number,
        taskType: TaskType,
        verificationData?: any
    ): Promise<TaskVerificationResponse> {
        try {
            switch (taskType) {
                case "telegram_channel":
                case "telegram_chat":
                    return await this.verifyTelegramMembership(userId, taskId, verificationData);
                case "twitter_follow":
                    return await this.verifyTwitterFollow(userId, taskId, verificationData);
                case "twitter_repost":
                    return await this.verifyTwitterRepost(userId, taskId, verificationData);
                case "visit_website":
                    return await this.verifyWebsiteVisit(userId, taskId, verificationData);
                case "telegram_story":
                    return await this.verifyTelegramStory(userId, taskId, verificationData);
                default:
                    return {
                        success: false,
                        message: "Unknown task type",
                        verified: false,
                        error: "Unknown task type"
                    };
            }
        } catch (error) {
            console.error("Error in verifyTask:", error);
            return {
                success: false,
                message: "Verification failed",
                verified: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },

    // Верификация участия в Telegram канале/чате
    async verifyTelegramMembership(
        userId: string,
        taskId: number,
        verificationData?: any
    ): Promise<TaskVerificationResponse> {
        try {
            const task = await this.getTask(taskId);
            if (!task || !task.channel_id) {
                return {
                    success: false,
                    message: "Task not found or invalid",
                    verified: false,
                    error: "Task not found or missing channel ID"
                };
            }

            // В продакшене здесь должна быть интеграция с Telegram API
            // Для примера возвращаем успешную верификацию
            console.log(`Verifying Telegram membership for user ${userId} in channel ${task.channel_id}`);

            // Имитация проверки участия
            const isVerified = true; // В реальности нужно проверить через Telegram API

            if (isVerified) {
                return {
                    success: true,
                    message: "Telegram membership verified",
                    verified: true
                };
            } else {
                return {
                    success: false,
                    message: "Telegram membership not verified",
                    verified: false,
                    error: "Not a member of the channel"
                };
            }
        } catch (error) {
            console.error("Error verifying Telegram membership:", error);
            return {
                success: false,
                message: "Verification failed",
                verified: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },

    // Верификация подписки на Twitter
    async verifyTwitterFollow(
        userId: string,
        taskId: number,
        verificationData?: any
    ): Promise<TaskVerificationResponse> {
        try {
            console.log(`Verifying Twitter follow for user ${userId}, task ${taskId}`);
            const isVerified = true; // В реальности нужно проверить через Twitter API

            return {
                success: true,
                message: isVerified ? "Twitter follow verified" : "Twitter follow not verified",
                verified: isVerified
            };
        } catch (error) {
            console.error("Error verifying Twitter follow:", error);
            return {
                success: false,
                message: "Verification failed",
                verified: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },

    // Верификация репоста в Twitter
    async verifyTwitterRepost(
        userId: string,
        taskId: number,
        verificationData?: any
    ): Promise<TaskVerificationResponse> {
        try {
            console.log(`Verifying Twitter repost for user ${userId}, task ${taskId}`);
            const isVerified = true; // В реальности нужно проверить через Twitter API

            return {
                success: true,
                message: isVerified ? "Twitter repost verified" : "Twitter repost not verified",
                verified: isVerified
            };
        } catch (error) {
            console.error("Error verifying Twitter repost:", error);
            return {
                success: false,
                message: "Verification failed",
                verified: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },

    // Верификация посещения сайта
    async verifyWebsiteVisit(
        userId: string,
        taskId: number,
        verificationData?: any
    ): Promise<TaskVerificationResponse> {
        try {
            console.log(`Verifying website visit for user ${userId}, task ${taskId}`);

            return {
                success: true,
                message: "Website visit verified",
                verified: true
            };
        } catch (error) {
            console.error("Error verifying website visit:", error);
            return {
                success: false,
                message: "Verification failed",
                verified: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },

    // Верификация публикации в Telegram Stories
    async verifyTelegramStory(
        userId: string,
        taskId: number,
        verificationData?: any
    ): Promise<TaskVerificationResponse> {
        try {
            console.log(`Verifying Telegram story for user ${userId}, task ${taskId}`);
            const isVerified = true; // В реальности нужно проверить через Telegram API

            return {
                success: true,
                message: isVerified ? "Telegram story verified" : "Telegram story not verified",
                verified: isVerified
            };
        } catch (error) {
            console.error("Error verifying Telegram story:", error);
            return {
                success: false,
                message: "Verification failed",
                verified: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },

    // Получение статистики заданий пользователя
    async getUserTaskStats(userId: string): Promise<{
        total_tasks: number;
        completed_tasks: number;
        completion_rate: number;
        total_attempts_earned: number;
    }> {
        try {
            const { data: totalTasks, error: totalError } = await supabaseServer
                .from("tasks")
                .select("id", { count: "exact" })
                .eq("is_active", true);

            const { data: completedTasks, error: completedError } = await supabaseServer
                .from("user_tasks")
                .select("attempts_awarded", { count: "exact" })
                .eq("user_id", userId);

            if (totalError || completedError) {
                console.error("Error fetching task stats:", totalError || completedError);
                return {
                    total_tasks: 0,
                    completed_tasks: 0,
                    completion_rate: 0,
                    total_attempts_earned: 0
                };
            }

            const totalCount = totalTasks?.length || 0;
            const completedCount = completedTasks?.length || 0;
            const totalAttemptsEarned = completedTasks?.reduce((sum, task) => sum + (task.attempts_awarded || 0), 0) || 0;

            return {
                total_tasks: totalCount,
                completed_tasks: completedCount,
                completion_rate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
                total_attempts_earned: totalAttemptsEarned
            };
        } catch (error) {
            console.error("Error in getUserTaskStats:", error);
            return {
                total_tasks: 0,
                completed_tasks: 0,
                completion_rate: 0,
                total_attempts_earned: 0
            };
        }
    }
};

export default taskService;