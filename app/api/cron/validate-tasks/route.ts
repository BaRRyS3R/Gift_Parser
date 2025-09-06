// src/app/api/cron/validate-tasks/route.ts - Optimized CRON service for validating Telegram tasks

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase_server";

const VALIDATION_CONFIG = {
  MAX_TASKS_PER_RUN: parseInt(process.env.CRON_MAX_VALIDATION_TASKS || "10000"),
  EXECUTION_TIMEOUT: parseInt(process.env.CRON_VALIDATION_TIMEOUT || "50"),
  CRON_API_KEY: process.env.CRON_API_KEY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_API,
  PARALLEL_BATCH_SIZE: parseInt(process.env.CRON_PARALLEL_BATCH_SIZE || "100"),
} as const;

interface ValidationResponse {
  success: boolean;
  validated_tasks: number;
  penalties_applied: number;
  total_penalty_amount: number;
  failed_validations: number;
  execution_time_ms: number;
  error?: string;
}

interface TaskValidationResult {
  user_task_id: string;
  user_id: string;
  telegram_id: number;
  task_id: string;
  chat_id: number;
  reward_amount: number;
  is_member: boolean;
  penalty_applied: boolean;
  validation_error?: string;
}

interface PenaltyResult {
  user_task_id: string;
  penalty_applied: boolean;
  penalty_amount: number;
  error?: string;
}

/**
 * POST /api/cron/validate-tasks
 * Validates Telegram channel/chat memberships for rewarded tasks
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ValidationResponse>> {
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey || apiKey !== VALIDATION_CONFIG.CRON_API_KEY) {
      console.warn("[CRON] Unauthorized attempt to access validate-tasks endpoint");
      return NextResponse.json(
        {
          success: false,
          validated_tasks: 0,
          penalties_applied: 0,
          total_penalty_amount: 0,
          failed_validations: 0,
          execution_time_ms: Date.now() - startTime,
          error: "Unauthorized access",
        },
        { status: 401 }
      );
    }

    console.log("[CRON] Starting Telegram tasks validation process");

    if (!VALIDATION_CONFIG.TELEGRAM_BOT_TOKEN) {
      throw new Error("Telegram Bot Token not configured");
    }

    const tasksToValidate = await getTasksRequiringValidation();

    console.log(`[CRON] Found ${tasksToValidate.length} tasks requiring validation`);

    if (tasksToValidate.length === 0) {
      return NextResponse.json({
        success: true,
        validated_tasks: 0,
        penalties_applied: 0,
        total_penalty_amount: 0,
        failed_validations: 0,
        execution_time_ms: Date.now() - startTime,
      });
    }

    const tasksToProcess = tasksToValidate.slice(0, VALIDATION_CONFIG.MAX_TASKS_PER_RUN);

    const validationResults = await validateTasksInParallel(tasksToProcess);

    const penaltyResults = await applyPenaltiesForInvalidTasks(validationResults);

    const totalValidated = validationResults.length;
    const totalPenalties = penaltyResults.filter(r => r.penalty_applied).length;
    const totalPenaltyAmount = penaltyResults
      .filter(r => r.penalty_applied)
      .reduce((sum, r) => sum + r.penalty_amount, 0);
    const failedValidations = validationResults.filter(r => r.validation_error).length;

    const executionTime = Date.now() - startTime;

    console.log(`[CRON] Validation completed: ${totalValidated} tasks validated, ${totalPenalties} penalties applied`);
    console.log(`[CRON] Total penalty amount: ${totalPenaltyAmount} bonus attempts removed`);

    return NextResponse.json({
      success: true,
      validated_tasks: totalValidated,
      penalties_applied: totalPenalties,
      total_penalty_amount: totalPenaltyAmount,
      failed_validations: failedValidations,
      execution_time_ms: executionTime,
    });

  } catch (error) {
    console.error("[CRON] Error in tasks validation:", error);

    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        validated_tasks: 0,
        penalties_applied: 0,
        total_penalty_amount: 0,
        failed_validations: 0,
        execution_time_ms: executionTime,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Get all rewarded Telegram tasks that haven't been penalized yet
 */
async function getTasksRequiringValidation() {
  const { data, error } = await supabaseServer
    .from("user_tasks")
    .select(`
      id,
      user_id,
      task_id,
      rewarded_at,
      penalty_applied,
      users!inner(telegram_id),
      tasks!inner(telegram_id, task_type, attempts_reward)
    `)
    .eq("status", "rewarded")
    .in("tasks.task_type", ["telegram_channel", "telegram_chat"])
    .eq("tasks.is_active", true)
    .eq("penalty_applied", false)
    .limit(VALIDATION_CONFIG.MAX_TASKS_PER_RUN);

  if (error) {
    console.error("[CRON] Error fetching tasks requiring validation:", error);
    throw new Error("Failed to fetch tasks requiring validation");
  }

  return data || [];
}

/**
 * Validate all tasks in parallel batches without rate limiting
 */
async function validateTasksInParallel(tasks: any[]): Promise<TaskValidationResult[]> {
  const results: TaskValidationResult[] = [];
  const batchSize = VALIDATION_CONFIG.PARALLEL_BATCH_SIZE;

  console.log(`[CRON] Validating ${tasks.length} tasks in parallel batches of ${batchSize}`);

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(tasks.length / batchSize);

    console.log(`[CRON] Processing validation batch ${batchNumber}/${totalBatches} (${batch.length} tasks)`);

    const batchPromises = batch.map(async (task) => {
      try {
        const membershipResult = await validateTelegramMembership(
          task.users.telegram_id,
          task.tasks.telegram_id
        );

        return {
          user_task_id: task.id,
          user_id: task.user_id,
          telegram_id: task.users.telegram_id,
          task_id: task.task_id,
          chat_id: task.tasks.telegram_id,
          reward_amount: task.tasks.attempts_reward,
          is_member: membershipResult.is_member,
          penalty_applied: false,
          validation_error: membershipResult.error,
        };
      } catch (error) {
        console.error(`[CRON] Error validating task ${task.id}:`, error);
        
        return {
          user_task_id: task.id,
          user_id: task.user_id,
          telegram_id: task.users.telegram_id,
          task_id: task.task_id,
          chat_id: task.tasks.telegram_id,
          reward_amount: task.tasks.attempts_reward,
          is_member: true, // Assume member if validation fails
          penalty_applied: false,
          validation_error: error instanceof Error ? error.message : "Unknown validation error",
        };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    
    const validatedResults: TaskValidationResult[] = [];
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        validatedResults.push(result.value);
      } else {
        console.error(`[CRON] Batch promise rejected:`, result.reason);
      }
    });

    results.push(...validatedResults);
  }

  const successfulValidations = results.filter(r => !r.validation_error).length;
  const nonMembers = results.filter(r => !r.is_member && !r.validation_error).length;

  console.log(`[CRON] Validation summary: ${successfulValidations} successful, ${nonMembers} users not members`);

  return results;
}

/**
 * Apply penalties for users who are no longer members
 */
async function applyPenaltiesForInvalidTasks(
  validationResults: TaskValidationResult[]
): Promise<PenaltyResult[]> {
  const penaltyResults: PenaltyResult[] = [];

  const tasksRequiringPenalty = validationResults.filter(
    result => !result.is_member && !result.validation_error
  );

  console.log(`[CRON] Applying penalties for ${tasksRequiringPenalty.length} invalid tasks`);

  for (const task of tasksRequiringPenalty) {
    try {
      const penaltyResult = await applyPenaltyForTask(task);
      penaltyResults.push(penaltyResult);

      if (penaltyResult.penalty_applied) {
        console.log(`[CRON] Penalty applied for user ${task.telegram_id}, task ${task.task_id}: -${penaltyResult.penalty_amount} bonus attempts`);
      }
    } catch (error) {
      console.error(`[CRON] Error applying penalty for task ${task.user_task_id}:`, error);
      
      penaltyResults.push({
        user_task_id: task.user_task_id,
        penalty_applied: false,
        penalty_amount: 0,
        error: error instanceof Error ? error.message : "Unknown penalty error",
      });
    }
  }

  validationResults
    .filter(result => result.is_member || result.validation_error)
    .forEach(task => {
      penaltyResults.push({
        user_task_id: task.user_task_id,
        penalty_applied: false,
        penalty_amount: 0,
      });
    });

  return penaltyResults;
}

/**
 * Apply penalty for a single invalid task
 */
async function applyPenaltyForTask(task: TaskValidationResult): Promise<PenaltyResult> {
  try {
    console.log(`[CRON] Applying penalty for user ${task.telegram_id}, removing ${task.reward_amount} bonus attempts`);

    const { error } = await supabaseServer.rpc('apply_task_validation_penalty', {
      p_user_id: task.user_id,
      p_user_task_id: task.user_task_id,
      p_penalty_amount: task.reward_amount
    });

    if (error) {
      console.error(`[CRON] Database error applying penalty:`, error);
      throw error;
    }

    return {
      user_task_id: task.user_task_id,
      penalty_applied: true,
      penalty_amount: task.reward_amount,
    };

  } catch (error) {
    console.error(`[CRON] Error in applyPenaltyForTask:`, error);
    
    return {
      user_task_id: task.user_task_id,
      penalty_applied: false,
      penalty_amount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate Telegram channel/chat membership
 */
async function validateTelegramMembership(
  telegramUserId: number,
  chatId: number
): Promise<{ is_member: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${VALIDATION_CONFIG.TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${telegramUserId}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[CRON] Telegram API error for user ${telegramUserId}, chat ${chatId}:`, errorData);

      if (errorData.error_code === 400) {
        return { is_member: false, error: "User not found in chat" };
      }

      throw new Error(`Telegram API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      return { 
        is_member: false, 
        error: data.description || "Telegram verification failed" 
      };
    }

    const memberStatus = data.result.status;
    const isMember = ["creator", "administrator", "member"].includes(memberStatus);

    return { is_member: isMember };

  } catch (error) {
    console.error(`[CRON] Error validating membership for user ${telegramUserId}:`, error);
    
    return {
      is_member: true, // Default to member if validation fails to avoid false penalties
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

/**
 * GET /api/cron/validate-tasks
 * Information about validation service for debugging
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");

  if (!apiKey || apiKey !== VALIDATION_CONFIG.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    config: {
      max_tasks_per_run: VALIDATION_CONFIG.MAX_TASKS_PER_RUN,
      execution_timeout: VALIDATION_CONFIG.EXECUTION_TIMEOUT,
      parallel_batch_size: VALIDATION_CONFIG.PARALLEL_BATCH_SIZE,
    },
    status: "Task validation service is active with optimized parallel processing",
    description: "Validates Telegram memberships without rate limiting since no notifications are sent",
    next_execution_url: `${request.nextUrl.origin}/api/cron/validate-tasks`,
  });
}