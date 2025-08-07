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
  // Получение заданий с информацией о выполнении для пользователя
  async getTasksForUser(userId: string): Promise<TaskWithCompletion[]> {
    // Получаем активные задания
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    if (!tasks) {
      return [];
    }

    // Получаем выполнения заданий только для текущего пользователя
    const { data: completions, error: completionsError } = await supabase
      .from("user_task_completions")
      .select("*")
      .eq("user_id", userId);

    if (completionsError) {
      console.error("Error fetching user completions:", completionsError);
      throw completionsError;
    }

    const completionsMap = new Map<string, UserTaskCompletion[]>();

    (completions || []).forEach((completion) => {
      if (!completionsMap.has(completion.task_id)) {
        completionsMap.set(completion.task_id, []);
      }
      completionsMap.get(completion.task_id)!.push(completion);
    });

    const result = tasks.map((task) => {
      const userCompletions = completionsMap.get(task.id) || [];
      const latestCompletion = userCompletions.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];

      let canComplete = true;
      let nextAvailableAt: string | undefined;

      if (task.type === "story_share") {
        if (task.cooldown_minutes && latestCompletion?.claimed_at) {
          const lastClaimedAt = new Date(latestCompletion.claimed_at);
          const cooldownMs = task.cooldown_minutes * 60 * 1000;
          const nextAvailable = new Date(lastClaimedAt.getTime() + cooldownMs);

          if (new Date() < nextAvailable) {
            canComplete = false;
            nextAvailableAt = nextAvailable.toISOString();
          }
        }
      } else {
        // Для всех остальных заданий: только одно выполнение
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

      return taskWithCompletion;
    });

    return result;
  },

  // Начало выполнения задания
  async startTask(userId: string, taskId: string): Promise<UserTaskCompletion> {
    // Проверяем, можно ли начать задание
    const tasksWithCompletion = await this.getTasksForUser(userId);
    const task = tasksWithCompletion.find((t) => t.id === taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    if (!task.can_complete) {
      throw new Error("Task cannot be completed at this time");
    }

    const { data, error } = await supabase
      .from("user_task_completions")
      .insert({
        user_id: userId,
        task_id: taskId,
        status: "started",
      })
      .select()
      .single();

    if (error) {
      console.error("Error starting task:", error);
      throw error;
    }

    return data;
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
  async completeTask(
    userId: string,
    taskId: string,
  ): Promise<UserTaskCompletion> {
    // Находим последнее начатое выполнение задания
    const { data: completion, error: findError } = await supabase
      .from("user_task_completions")
      .select("*")
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .eq("status", "started")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (findError || !completion) {
      throw new Error("Task completion not found or not started");
    }

    const { data, error } = await supabase
      .from("user_task_completions")
      .update({
        completed_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", completion.id)
      .select()
      .single();

    if (error) {
      console.error("Error completing task:", error);
      throw error;
    }

    return data;
  },

  // Получение награды за задание
  async claimTaskReward(
    userId: string,
    taskId: string,
    telegramUserId: number,
  ): Promise<{
    completion: UserTaskCompletion;
    reward: number;
  }> {
    // Находим завершенное задание
    const { data: completion, error: findError } = await supabase
      .from("user_task_completions")
      .select("*, task:tasks(*)")
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (findError || !completion) {
      throw new Error("Completed task not found");
    }

    const task = completion.task as unknown as Task;

    // Обновляем статус на "claimed" и добавляем время получения награды
    const { data: updatedCompletion, error: updateError } = await supabase
      .from("user_task_completions")
      .update({
        claimed_at: new Date().toISOString(),
        status: "claimed",
      })
      .eq("id", completion.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error claiming task reward:", updateError);
      throw updateError;
    }

    // Начисляем попытки пользователю
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("attempts_remaining")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new Error("User not found");
    }

    const { error: updateUserError } = await supabase
      .from("users")
      .update({
        attempts_remaining: user.attempts_remaining + task.reward_attempts,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateUserError) {
      console.error("Error updating user attempts:", updateUserError);
      throw updateUserError;
    }

    return {
      completion: updatedCompletion,
      reward: task.reward_attempts,
    };
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
