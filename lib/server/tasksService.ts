// src/lib/server/tasksService.ts - Server-side tasks management service

import { supabaseServer } from "@/lib/supabase_server";
import {
  TaskWithStatus,
  TaskType,
  TaskStatus,
  TelegramMembershipResponse,
  TaskStats,
} from "@/types/tasks";

// Server-side tasks service
export const serverTasksService = {
  /**
   * Get all tasks with user completion status
   */
  async getUserTasksWithStatus(userId: string): Promise<TaskWithStatus[]> {
    try {
      const { data, error } = await supabaseServer.rpc(
        "get_user_tasks_with_status",
        {
          user_id_param: userId,
        },
      );

      if (error) {
        console.error("Error fetching user tasks:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in getUserTasksWithStatus:", error);
      throw new Error("Failed to fetch user tasks");
    }
  },

  /**
   * Start a task for user
   */
  async startTask(userId: string, taskId: string): Promise<TaskWithStatus> {
    try {
      // First, get the task details
      const { data: task, error: taskError } = await supabaseServer
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .eq("is_active", true)
        .single();

      if (taskError || !task) {
        throw new Error("Task not found or inactive");
      }

      // Check if user already has this task
      const { data: existingUserTask, error: existingError } =
        await supabaseServer
          .from("user_tasks")
          .select("*")
          .eq("user_id", userId)
          .eq("task_id", taskId)
          .maybeSingle();

      if (existingError) {
        console.error("Error checking existing task:", existingError);
        throw existingError;
      }

      // If task already exists and not in not_started state, return current state
      if (
        existingUserTask &&
        existingUserTask.status !== TaskStatus.NOT_STARTED
      ) {
        // Return current task with status
        const taskWithStatus: TaskWithStatus = {
          task_id: task.id,
          title: task.title,
          description: task.description,
          task_type: task.task_type,
          url: task.url,
          telegram_id: task.telegram_id,
          attempts_reward: task.attempts_reward,
          image_url: task.image_url,
          user_status: existingUserTask.status,
          started_at: existingUserTask.started_at,
          completed_at: existingUserTask.completed_at,
          rewarded_at: existingUserTask.rewarded_at,
        };

        return taskWithStatus;
      }

      const now = new Date().toISOString();

      // Create or update user task
      const { data: userTask, error: userTaskError } = existingUserTask
        ? await supabaseServer
            .from("user_tasks")
            .update({
              status: TaskStatus.STARTED,
              started_at: now,
              updated_at: now,
            })
            .eq("id", existingUserTask.id)
            .select()
            .single()
        : await supabaseServer
            .from("user_tasks")
            .insert({
              user_id: userId,
              task_id: taskId,
              status: TaskStatus.STARTED,
              started_at: now,
            })
            .select()
            .single();

      if (userTaskError) {
        console.error("Error creating/updating user task:", userTaskError);
        throw userTaskError;
      }

      const taskWithStatus: TaskWithStatus = {
        task_id: task.id,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        url: task.url,
        telegram_id: task.telegram_id,
        attempts_reward: task.attempts_reward,
        image_url: task.image_url,
        user_status: TaskStatus.STARTED,
        started_at: userTask.started_at,
        completed_at: userTask.completed_at,
        rewarded_at: userTask.rewarded_at,
      };

      console.log(`Task started for user ${userId}:`, taskId);

      return taskWithStatus;
    } catch (error) {
      console.error("Error starting task:", error);
      throw new Error("Failed to start task");
    }
  },

  /**
   * Verify Telegram channel/chat membership
   */
  async verifyTelegramMembership(
    telegramUserId: number,
    chatId: number,
  ): Promise<TelegramMembershipResponse> {
    try {
      const botToken = process.env.TELEGRAM_BOT_API;

      if (!botToken) {
        throw new Error("Telegram Bot API token not configured");
      }

      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${chatId}&user_id=${telegramUserId}`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        console.error("Telegram API error:", errorData);

        // Handle specific Telegram API errors
        if (errorData.error_code === 400) {
          return {
            success: false,
            isMember: false,
            error: "User not found in chat",
          };
        }

        throw new Error(`Telegram API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok) {
        return {
          success: false,
          isMember: false,
          error: data.description || "Telegram verification failed",
        };
      }

      const memberStatus = data.result.status;
      const isMember = ["creator", "administrator", "member"].includes(
        memberStatus,
      );

      return {
        success: true,
        isMember,
        memberStatus,
      };
    } catch (error) {
      console.error("Error verifying Telegram membership:", error);

      return {
        success: false,
        isMember: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  },

  /**
   * Verify task completion
   */
  async verifyTask(
    userId: string,
    taskId: string,
    telegramUserId?: number,
    verificationData?: Record<string, any>,
  ): Promise<TaskWithStatus> {
    try {
      // Get task and user task details
      const { data: task, error: taskError } = await supabaseServer
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .eq("is_active", true)
        .single();

      if (taskError || !task) {
        throw new Error("Task not found or inactive");
      }

      const { data: userTask, error: userTaskError } = await supabaseServer
        .from("user_tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("task_id", taskId)
        .single();

      if (userTaskError || !userTask) {
        throw new Error("User task not found");
      }

      if (userTask.status !== TaskStatus.STARTED) {
        throw new Error("Task not in started state");
      }

      let isVerified = false;
      let finalVerificationData = verificationData || {};

      // Perform verification based on task type
      if (
        task.task_type === TaskType.TELEGRAM_CHANNEL ||
        task.task_type === TaskType.TELEGRAM_CHAT
      ) {
        if (!telegramUserId || !task.telegram_id) {
          throw new Error("Telegram verification data missing");
        }

        const membershipResult = await this.verifyTelegramMembership(
          telegramUserId,
          task.telegram_id,
        );

        if (!membershipResult.success) {
          throw new Error(
            membershipResult.error || "Telegram verification failed",
          );
        }

        isVerified = membershipResult.isMember;
        finalVerificationData = {
          chatId: task.telegram_id,
          userId: telegramUserId,
          memberStatus: membershipResult.memberStatus,
          verifiedAt: new Date().toISOString(),
        };
      } else {
        // For website, Twitter tasks - trust-based verification
        // Check if this is a trust-based verification request
        const isTrustBased = verificationData?.trustBased === true;

        if (isTrustBased) {
          isVerified = true;
          finalVerificationData = {
            verifiedAt: new Date().toISOString(),
            trustBased: true,
            taskType: task.task_type,
            ...verificationData,
          };
        } else {
          // Traditional verification - assume user completed the action
          isVerified = true;
          finalVerificationData = {
            verifiedAt: new Date().toISOString(),
            ...verificationData,
          };
        }
      }

      if (!isVerified) {
        throw new Error("Task verification failed");
      }

      // Update user task to completed
      const now = new Date().toISOString();
      const { data: updatedUserTask, error: updateError } = await supabaseServer
        .from("user_tasks")
        .update({
          status: TaskStatus.COMPLETED,
          completed_at: now,
          verification_data: finalVerificationData,
          updated_at: now,
        })
        .eq("id", userTask.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating task status:", updateError);
        throw updateError;
      }

      const taskWithStatus: TaskWithStatus = {
        task_id: task.id,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        url: task.url,
        telegram_id: task.telegram_id,
        attempts_reward: task.attempts_reward,
        image_url: task.image_url,
        user_status: TaskStatus.COMPLETED,
        started_at: updatedUserTask.started_at,
        completed_at: updatedUserTask.completed_at,
        rewarded_at: updatedUserTask.rewarded_at,
      };

      console.log(`Task verified for user ${userId}:`, taskId);

      return taskWithStatus;
    } catch (error) {
      console.error("Error verifying task:", error);
      throw error;
    }
  },

  /**
   * Claim task reward
   */
  async claimTaskReward(
    userId: string,
    taskId: string,
  ): Promise<{
    taskWithStatus: TaskWithStatus;
    attemptsAdded: number;
    newAttemptsTotal: number;
  }> {
    try {
      // Get task and user task details
      const { data: task, error: taskError } = await supabaseServer
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .eq("is_active", true)
        .single();

      if (taskError || !task) {
        throw new Error("Task not found or inactive");
      }

      const { data: userTask, error: userTaskError } = await supabaseServer
        .from("user_tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("task_id", taskId)
        .single();

      if (userTaskError || !userTask) {
        throw new Error("User task not found");
      }

      if (userTask.status !== TaskStatus.COMPLETED) {
        throw new Error("Task not completed yet");
      }

      // Get current user data
      const { data: user, error: userError } = await supabaseServer
        .from("users")
        .select("attempts_remaining")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        throw new Error("User not found");
      }

      const now = new Date().toISOString();
      const attemptsToAdd = task.attempts_reward;
      const newAttemptsTotal = user.attempts_remaining + attemptsToAdd;

      // Start transaction
      const { error: transactionError } = await supabaseServer.rpc(
        "claim_task_reward_transaction",
        {
          p_user_id: userId,
          p_task_id: taskId,
          p_attempts_to_add: attemptsToAdd,
          p_completed_at: now,
        },
      );

      if (transactionError) {
        console.error("Error in reward claim transaction:", transactionError);
        throw transactionError;
      }

      // Alternative approach using individual updates if RPC doesn't exist
      try {
        // Update user attempts
        const { error: userUpdateError } = await supabaseServer
          .from("users")
          .update({
            attempts_remaining: newAttemptsTotal,
            updated_at: now,
          })
          .eq("id", userId);

        if (userUpdateError) throw userUpdateError;

        // Update user task
        const { error: taskUpdateError } = await supabaseServer
          .from("user_tasks")
          .update({
            status: TaskStatus.REWARDED,
            rewarded_at: now,
            updated_at: now,
          })
          .eq("id", userTask.id);

        if (taskUpdateError) throw taskUpdateError;
      } catch (updateError) {
        console.error("Error updating reward claim:", updateError);
        throw updateError;
      }

      const taskWithStatus: TaskWithStatus = {
        task_id: task.id,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        url: task.url,
        telegram_id: task.telegram_id,
        attempts_reward: task.attempts_reward,
        image_url: task.image_url,
        user_status: TaskStatus.REWARDED,
        started_at: userTask.started_at,
        completed_at: userTask.completed_at,
        rewarded_at: now,
      };

      console.log(`Task reward claimed for user ${userId}:`, {
        taskId,
        attemptsAdded: attemptsToAdd,
        newAttemptsTotal,
      });

      return {
        taskWithStatus,
        attemptsAdded: attemptsToAdd,
        newAttemptsTotal,
      };
    } catch (error) {
      console.error("Error claiming task reward:", error);
      throw error;
    }
  },

  /**
   * Get user task statistics
   */
  async getUserTaskStats(userId: string): Promise<TaskStats> {
    try {
      const tasks = await this.getUserTasksWithStatus(userId);

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(
        (task) =>
          task.user_status === TaskStatus.COMPLETED ||
          task.user_status === TaskStatus.REWARDED,
      ).length;
      const pendingTasks = tasks.filter(
        (task) => task.user_status === TaskStatus.STARTED,
      ).length;
      const totalRewardsEarned = tasks
        .filter((task) => task.user_status === TaskStatus.REWARDED)
        .reduce((total, task) => total + task.attempts_reward, 0);
      const completionRate =
        totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        totalTasks,
        completedTasks,
        pendingTasks,
        totalRewardsEarned,
        completionRate,
      };
    } catch (error) {
      console.error("Error getting user task stats:", error);
      throw new Error("Failed to get task statistics");
    }
  },

  /**
   * Get server time for consistent validation
   */
  async getServerTime(): Promise<Date> {
    try {
      const { data, error } = await supabaseServer.rpc("get_current_timestamp");

      if (error) {
        console.warn("Failed to get server time, using current time:", error);

        return new Date();
      }

      return new Date(data);
    } catch (error) {
      console.warn(
        "Error getting server time, falling back to current time:",
        error,
      );

      return new Date();
    }
  },
};
