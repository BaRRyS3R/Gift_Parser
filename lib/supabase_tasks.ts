// src/lib/supabase_tasks.ts - Сервис для работы с заданиями

import { supabase } from "./supabase";

export type TaskType =
  | "telegram_channel"
  | "telegram_chat"
  | "twitter_follow"
  | "twitter_repost"
  | "website_visit"
  | "story_share";

export type TaskStatus = "started" | "completed" | "claimed";

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  telegram_id?: number;
  url: string;
  reward_attempts: number;
  icon: string;
  color: string;
  is_active: boolean;
  cooldown_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface UserTaskCompletion {
  id: string;
  user_id: string;
  task_id: string;
  started_at: string;
  completed_at?: string;
  claimed_at?: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  task?: Task; // Подключаемые данные задания
}

export interface TaskWithCompletion extends Task {
  user_completion?: UserTaskCompletion;
  can_complete: boolean;
  next_available_at?: string;
}

export const taskService = {
  // Получение всех активных заданий
  async getActiveTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }

    return data || [];
  },

  // Получение заданий с информацией о выполнении для пользователя
  async getTasksForUser(userId: string): Promise<TaskWithCompletion[]> {
    console.log("=== TASK SERVICE: getTasksForUser START ===");
    console.log("User ID:", userId);

    // Validate userId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error("Invalid user ID format:", userId);
      throw new Error("Invalid user ID format");
    }

    try {
      // Get active tasks with timeout
      console.log("Fetching active tasks...");
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError);
        throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
      }

      console.log("Active tasks found:", tasks?.length || 0);

      if (!tasks || tasks.length === 0) {
        console.log("No active tasks found, returning empty array");
        return [];
      }

      // Get user completions with better error handling
      console.log("Fetching user completions for user ID:", userId);
      const { data: completions, error: completionsError } = await supabase
        .from("user_task_completions")
        .select("*")
        .eq("user_id", userId);

      if (completionsError) {
        console.error("Error fetching user completions:", completionsError);
        // Don't throw here - continue with empty completions
        console.log("Continuing with empty completions due to error");
      }

      console.log("User completions found:", completions?.length || 0);

      // Build completions map safely
      const completionsMap = new Map<string, UserTaskCompletion[]>();

      if (completions && Array.isArray(completions)) {
        completions.forEach((completion) => {
          if (completion && completion.task_id) {
            if (!completionsMap.has(completion.task_id)) {
              completionsMap.set(completion.task_id, []);
            }
            completionsMap.get(completion.task_id)!.push(completion);
          }
        });
      }

      console.log("Completions map keys:", Array.from(completionsMap.keys()));

      // Process tasks with safety checks
      const result = tasks.map((task) => {
        try {
          const userCompletions = completionsMap.get(task.id) || [];
          const latestCompletion = userCompletions.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];

          let canComplete = true;
          let nextAvailableAt: string | undefined;

          // Handle story tasks with cooldown
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
                // Continue with default values
              }
            }
          } else {
            // For all other tasks: only one completion allowed
            if (latestCompletion?.status === "claimed") {
              canComplete = false;
            }
          }

          const taskWithCompletion = {
            ...task,
            user_completion: latestCompletion,
            can_complete: canComplete,
            next_available_at: nextAvailableAt,
          };

          console.log(`Task ${task.id} (${task.name}):`, {
            type: task.type,
            can_complete: canComplete,
            user_completion: latestCompletion ? {
              status: latestCompletion.status,
              claimed_at: latestCompletion.claimed_at,
            } : null,
            next_available_at: nextAvailableAt,
          });

          return taskWithCompletion;
        } catch (taskProcessingError) {
          console.error("Error processing task:", task.id, taskProcessingError);
          // Return task with default values
          return {
            ...task,
            user_completion: undefined,
            can_complete: false,
            next_available_at: undefined,
          };
        }
      });

      console.log("Final result:", result.map((t) => ({
        id: t.id,
        name: t.name,
        can_complete: t.can_complete,
      })));

      console.log("=== TASK SERVICE: getTasksForUser END ===");
      return result;

    } catch (error) {
      console.error("Fatal error in getTasksForUser:", error);
      throw error;
    }
  },

  // Начало выполнения задания
  async startTask(userId: string, taskId: string): Promise<UserTaskCompletion> {
    console.log("=== TASK SERVICE startTask (RLS-safe) START ===");
    console.log("Input parameters:", { userId, taskId });

    try {
      // Validate input parameters
      if (!userId || !taskId) {
        console.error("Missing required parameters:", { userId: !!userId, taskId: !!taskId });
        throw new Error("Missing required parameters");
      }

      // Validate UUID formats
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId) || !uuidRegex.test(taskId)) {
        console.error("Invalid UUID format:", { userId, taskId });
        throw new Error("Invalid UUID format");
      }

      // Call database function to start task
      console.log("Calling database function start_user_task...");
      const { data, error } = await supabase.rpc('start_user_task', {
        p_user_id: userId,
        p_task_id: taskId
      });

      if (error) {
        console.error("Database function error:", error);
        throw new Error(`Database function error: ${error.message}`);
      }

      if (!data) {
        console.error("No data returned from database function");
        throw new Error("No data returned from database function");
      }

      console.log("Database function result:", data);

      // Parse the JSON result
      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (!result.success) {
        console.error("Function returned error:", result.error);
        throw new Error(result.error || "Task start failed");
      }

      if (!result.task_completion) {
        console.error("No task completion data in result");
        throw new Error("No task completion data returned");
      }

      const taskCompletion = result.task_completion;
      console.log("Task started successfully:", {
        id: taskCompletion.id,
        user_id: taskCompletion.user_id,
        task_id: taskCompletion.task_id,
        status: taskCompletion.status,
        started_at: taskCompletion.started_at
      });

      return taskCompletion;

    } catch (error) {
      console.error("Error in startTask:", error);
      throw error;
    } finally {
      console.log("=== TASK SERVICE startTask (RLS-safe) END ===");
    }
  },

  // Проверка выполнения задания
  async checkTaskCompletion(
    userId: string,
    taskId: string,
    telegramUserId: number,
  ): Promise<boolean> {
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      throw new Error("Task not found");
    }

    // Для telegram каналов и чатов проверяем через API
    if (task.type === "telegram_channel" || task.type === "telegram_chat") {
      return await this.checkTelegramMembership(
        task.telegram_id!,
        telegramUserId,
      );
    }

    // Для остальных типов заданий возвращаем true (проверка на доверии)
    return true;
  },

  // Проверка подписки на Telegram канал/чат
  async checkTelegramMembership(
    chatId: number,
    userId: number,
  ): Promise<boolean> {
    try {
      const response = await fetch("/api/check-telegram-membership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check membership");
      }

      const result = await response.json();

      return result.is_member;
    } catch (error) {
      console.error("Error checking telegram membership:", error);

      return false;
    }
  },

  // Завершение задания (отметка как выполненное)
  async completeTask(userId: string, taskId: string): Promise<UserTaskCompletion> {
    console.log("=== TASK SERVICE completeTask (RLS-safe) START ===");
    console.log("Input parameters:", { userId, taskId });

    try {
      // Validate input parameters
      if (!userId || !taskId) {
        throw new Error("Missing required parameters");
      }

      // Call database function to complete task
      console.log("Calling database function complete_user_task...");
      const { data, error } = await supabase.rpc('complete_user_task', {
        p_user_id: userId,
        p_task_id: taskId
      });

      if (error) {
        console.error("Database function error:", error);
        throw new Error(`Database function error: ${error.message}`);
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (!result.success) {
        console.error("Function returned error:", result.error);
        throw new Error(result.error || "Task completion failed");
      }

      console.log("Task completed successfully:", result.task_completion);
      return result.task_completion;

    } catch (error) {
      console.error("Error in completeTask:", error);
      throw error;
    } finally {
      console.log("=== TASK SERVICE completeTask (RLS-safe) END ===");
    }
  },

  // Получение награды за задание
  async claimTaskReward(userId: string, taskId: string, telegramUserId: number): Promise<{
    completion: UserTaskCompletion;
    reward: number;
  }> {
    console.log("=== TASK SERVICE claimTaskReward (RLS-safe) START ===");
    console.log("Input parameters:", { userId, taskId, telegramUserId });

    try {
      // Validate input parameters
      if (!userId || !taskId || !telegramUserId) {
        throw new Error("Missing required parameters");
      }

      // Call database function to claim reward
      console.log("Calling database function claim_task_reward...");
      const { data, error } = await supabase.rpc('claim_task_reward', {
        p_user_id: userId,
        p_task_id: taskId
      });

      if (error) {
        console.error("Database function error:", error);
        throw new Error(`Database function error: ${error.message}`);
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (!result.success) {
        console.error("Function returned error:", result.error);
        throw new Error(result.error || "Task reward claim failed");
      }

      console.log("Task reward claimed successfully:", {
        completion: result.task_completion,
        reward: result.reward_attempts,
        newTotal: result.new_attempts_total
      });

      return {
        completion: result.task_completion,
        reward: result.reward_attempts,
      };

    } catch (error) {
      console.error("Error in claimTaskReward:", error);
      throw error;
    } finally {
      console.log("=== TASK SERVICE claimTaskReward (RLS-safe) END ===");
    }
  },

  // Получение выполненных заданий пользователя
  async getUserCompletedTasks(userId: string): Promise<UserTaskCompletion[]> {
    const { data, error } = await supabase
      .from("user_task_completions")
      .select("*, task:tasks(*)")
      .eq("user_id", userId)
      .eq("status", "claimed")
      .order("claimed_at", { ascending: false });

    if (error) {
      console.error("Error fetching completed tasks:", error);
      throw error;
    }

    return data || [];
  },

  // Получение статистики заданий пользователя
  async getUserTaskStats(userId: string): Promise<{
    total_completed: number;
    total_attempts_earned: number;
    tasks_completed_today: number;
  }> {
    const { data: completions, error } = await supabase
      .from("user_task_completions")
      .select("*, task:tasks(reward_attempts)")
      .eq("user_id", userId)
      .eq("status", "claimed");

    if (error) {
      console.error("Error fetching user task stats:", error);
      throw error;
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const stats = {
      total_completed: completions?.length || 0,
      total_attempts_earned: 0,
      tasks_completed_today: 0,
    };

    if (completions) {
      for (const completion of completions) {
        const task = completion.task as unknown as Task;

        stats.total_attempts_earned += task.reward_attempts;

        if (completion.claimed_at && new Date(completion.claimed_at) >= today) {
          stats.tasks_completed_today++;
        }
      }
    }

    return stats;
  },
};
