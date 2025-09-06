// src/app/api/cron/verify-telegram-tasks/route.ts
// CRON service for verifying Telegram channel/chat subscriptions

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase_server";

// Configuration
const CRON_CONFIG = {
  // Telegram API rate limits
  TELEGRAM_RATE_LIMIT: 25, // Requests per second (with buffer from 30 limit)
  BATCH_DELAY_MS: 1100, // Delay between batches (with buffer)
  
  // CRON job settings
  MAX_USERS_PER_RUN: parseInt(process.env.MAX_TELEGRAM_CHECKS_PER_RUN || "10000"),
  EXECUTION_TIMEOUT: parseInt(process.env.CRON_EXECUTION_TIMEOUT || "50"),
  
  // API keys
  CRON_API_KEY: process.env.CRON_API_KEY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_API,
} as const;

// Response interface
interface CronResponse {
  success: boolean;
  processed_tasks: number;
  unsubscribed_users: number;
  penalties_applied: number;
  total_bonus_deducted: number;
  errors_count: number;
  execution_time_ms: number;
  error?: string;
  details?: {
    checked_users: number;
    telegram_channels_checked: number;
    telegram_chats_checked: number;
    api_errors: number;
  };
}

// Task check result
interface TaskCheckResult {
  user_task_id: string;
  user_id: string;
  telegram_id: number;
  task_id: string;
  chat_id: number;
  task_type: string;
  reward_amount: number;
  is_subscribed: boolean;
  penalty_applied: boolean;
  error?: string;
}

/**
 * Check Telegram membership status
 */
async function checkTelegramMembership(
  telegramUserId: number,
  chatId: number
): Promise<{ isSubscribed: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${CRON_CONFIG.TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${telegramUserId}`,
      { 
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle specific Telegram API errors
      if (errorData.error_code === 400) {
        // User not found in chat - means unsubscribed
        return { isSubscribed: false };
      }
      
      if (errorData.error_code === 403) {
        // Bot was kicked from chat or chat deleted
        console.error(`[CRON] Bot access error for chat ${chatId}: ${errorData.description}`);
        return { isSubscribed: true, error: "Bot access denied" }; // Skip check
      }
      
      return { isSubscribed: true, error: `API error: ${errorData.description || response.status}` };
    }

    const data = await response.json();
    
    if (!data.ok) {
      return { isSubscribed: true, error: data.description }; // Skip on error
    }

    const memberStatus = data.result.status;
    const isSubscribed = ["creator", "administrator", "member", "restricted"].includes(memberStatus);
    
    // "left" or "kicked" means unsubscribed
    return { isSubscribed };
    
  } catch (error) {
    console.error(`[CRON] Error checking membership for user ${telegramUserId} in chat ${chatId}:`, error);
    return { 
      isSubscribed: true, // Skip on error to avoid false penalties
      error: error instanceof Error ? error.message : "Check failed"
    };
  }
}

/**
 * Get tasks that need verification
 */
async function getTasksToVerify(): Promise<any[]> {
  const { data, error } = await supabaseServer
    .from("user_tasks")
    .select(`
      id,
      user_id,
      task_id,
      status,
      penalty_applied,
      users!inner (
        id,
        telegram_id,
        bonus_restore_attempts
      ),
      tasks!inner (
        id,
        task_type,
        telegram_id,
        attempts_reward
      )
    `)
    .eq("status", "rewarded")
    .eq("penalty_applied", false)
    .in("tasks.task_type", ["telegram_channel", "telegram_chat"])
    .not("tasks.telegram_id", "is", null)
    .limit(CRON_CONFIG.MAX_USERS_PER_RUN);

  if (error) {
    console.error("[CRON] Error fetching tasks to verify:", error);
    throw new Error("Failed to fetch tasks for verification");
  }

  return data || [];
}

/**
 * Apply penalty for unsubscribed users
 */
async function applyPenalty(
  userTaskId: string,
  userId: string,
  penaltyAmount: number
): Promise<boolean> {
  try {
    // First, get current bonus_restore_attempts value
    const { data: userData, error: fetchError } = await supabaseServer
      .from("users")
      .select("bonus_restore_attempts")
      .eq("id", userId)
      .single();

    if (fetchError || !userData) {
      console.error(`[CRON] Error fetching user ${userId}:`, fetchError);
      return false;
    }

    const currentBonus = userData.bonus_restore_attempts || 0;
    const newBonus = Math.max(0, currentBonus - penaltyAmount);

    // Update user's bonus_restore_attempts
    const { error: userError } = await supabaseServer
      .from("users")
      .update({
        bonus_restore_attempts: newBonus,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (userError) {
      console.error(`[CRON] Error updating user ${userId}:`, userError);
      return false;
    }

    // Mark penalty as applied
    const { error: taskError } = await supabaseServer
      .from("user_tasks")
      .update({
        penalty_applied: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", userTaskId);

    if (taskError) {
      console.error(`[CRON] Error updating user_task ${userTaskId}:`, taskError);
      // Try to rollback user update
      await supabaseServer
        .from("users")
        .update({
          bonus_restore_attempts: currentBonus,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);
      return false;
    }

    console.log(`[CRON] Penalty applied: User ${userId} bonus reduced from ${currentBonus} to ${newBonus} (-${penaltyAmount})`);
    return true;
  } catch (error) {
    console.error(`[CRON] Error applying penalty for user_task ${userTaskId}:`, error);
    return false;
  }
}

/**
 * Process tasks in batches with rate limiting
 */
async function processTaskBatches(tasks: any[]): Promise<TaskCheckResult[]> {
  const results: TaskCheckResult[] = [];
  
  console.log(`[CRON] Processing ${tasks.length} tasks in batches of ${CRON_CONFIG.TELEGRAM_RATE_LIMIT}`);
  
  // Group tasks by unique telegram_id to minimize API calls
  const userTasksMap = new Map<string, any[]>();
  
  for (const task of tasks) {
    const key = `${task.users.telegram_id}_${task.tasks.telegram_id}`;
    if (!userTasksMap.has(key)) {
      userTasksMap.set(key, []);
    }
    userTasksMap.get(key)?.push(task);
  }
  
  console.log(`[CRON] Grouped into ${userTasksMap.size} unique user-channel combinations`);
  
  // Process in batches respecting rate limits
  const entries = Array.from(userTasksMap.entries());
  
  for (let i = 0; i < entries.length; i += CRON_CONFIG.TELEGRAM_RATE_LIMIT) {
    const batch = entries.slice(i, i + CRON_CONFIG.TELEGRAM_RATE_LIMIT);
    const batchNumber = Math.floor(i / CRON_CONFIG.TELEGRAM_RATE_LIMIT) + 1;
    const totalBatches = Math.ceil(entries.length / CRON_CONFIG.TELEGRAM_RATE_LIMIT);
    
    console.log(`[CRON] Processing batch ${batchNumber}/${totalBatches}`);
    
    // Process batch in parallel
    const batchPromises = batch.map(async ([key, userTasks]) => {
      const firstTask = userTasks[0];
      const telegramUserId = firstTask.users.telegram_id;
      const chatId = firstTask.tasks.telegram_id;
      
      // Check membership once for all tasks with same user-channel
      const { isSubscribed, error } = await checkTelegramMembership(telegramUserId, chatId);
      
      // Process all tasks for this user-channel combination
      const taskResults: TaskCheckResult[] = [];
      
      for (const task of userTasks) {
        const result: TaskCheckResult = {
          user_task_id: task.id,
          user_id: task.user_id,
          telegram_id: telegramUserId,
          task_id: task.task_id,
          chat_id: chatId,
          task_type: task.tasks.task_type,
          reward_amount: task.tasks.attempts_reward,
          is_subscribed: isSubscribed,
          penalty_applied: false,
          error
        };
        
        // Apply penalty if unsubscribed
        if (!isSubscribed && !error) {
          const penaltyApplied = await applyPenalty(
            task.id,
            task.user_id,
            task.tasks.attempts_reward
          );
          
          result.penalty_applied = penaltyApplied;
          
          if (penaltyApplied) {
            console.log(`[CRON] Penalty applied: User ${telegramUserId} unsubscribed from ${chatId}, deducted ${task.tasks.attempts_reward} bonus attempts`);
          }
        }
        
        taskResults.push(result);
      }
      
      return taskResults;
    });
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());
    
    // Delay before next batch (except for last batch)
    if (i + CRON_CONFIG.TELEGRAM_RATE_LIMIT < entries.length) {
      console.log(`[CRON] Waiting ${CRON_CONFIG.BATCH_DELAY_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, CRON_CONFIG.BATCH_DELAY_MS));
    }
  }
  
  return results;
}

/**
 * POST /api/cron/verify-telegram-tasks
 * Verify Telegram channel/chat subscriptions and apply penalties
 */
export async function POST(request: NextRequest): Promise<NextResponse<CronResponse>> {
  const startTime = Date.now();
  
  try {
    // Verify authorization
    const authHeader = request.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");
    
    if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
      console.warn("[CRON] Unauthorized attempt to access verify-telegram-tasks endpoint");
      return NextResponse.json({
        success: false,
        processed_tasks: 0,
        unsubscribed_users: 0,
        penalties_applied: 0,
        total_bonus_deducted: 0,
        errors_count: 0,
        execution_time_ms: Date.now() - startTime,
        error: "Unauthorized access"
      }, { status: 401 });
    }
    
    console.log("[CRON] Starting Telegram subscription verification process");
    
    // Verify Telegram Bot Token
    if (!CRON_CONFIG.TELEGRAM_BOT_TOKEN) {
      throw new Error("Telegram Bot Token not configured");
    }
    
    // Get tasks to verify
    const tasksToVerify = await getTasksToVerify();
    
    console.log(`[CRON] Found ${tasksToVerify.length} tasks to verify`);
    
    if (tasksToVerify.length === 0) {
      return NextResponse.json({
        success: true,
        processed_tasks: 0,
        unsubscribed_users: 0,
        penalties_applied: 0,
        total_bonus_deducted: 0,
        errors_count: 0,
        execution_time_ms: Date.now() - startTime
      });
    }
    
    // Process tasks with rate limiting
    const results = await processTaskBatches(tasksToVerify);
    
    // Calculate statistics
    const stats = {
      processed_tasks: results.length,
      unsubscribed_users: results.filter(r => !r.is_subscribed && !r.error).length,
      penalties_applied: results.filter(r => r.penalty_applied).length,
      total_bonus_deducted: results
        .filter(r => r.penalty_applied)
        .reduce((sum, r) => sum + r.reward_amount, 0),
      errors_count: results.filter(r => r.error).length,
      checked_users: new Set(results.map(r => r.telegram_id)).size,
      telegram_channels_checked: results.filter(r => r.task_type === 'telegram_channel').length,
      telegram_chats_checked: results.filter(r => r.task_type === 'telegram_chat').length,
      api_errors: results.filter(r => r.error?.includes('API')).length
    };
    
    const executionTime = Date.now() - startTime;
    
    console.log(`[CRON] Verification completed in ${executionTime}ms`);
    console.log(`[CRON] Stats:`, stats);
    
    return NextResponse.json({
      success: true,
      processed_tasks: stats.processed_tasks,
      unsubscribed_users: stats.unsubscribed_users,
      penalties_applied: stats.penalties_applied,
      total_bonus_deducted: stats.total_bonus_deducted,
      errors_count: stats.errors_count,
      execution_time_ms: executionTime,
      details: {
        checked_users: stats.checked_users,
        telegram_channels_checked: stats.telegram_channels_checked,
        telegram_chats_checked: stats.telegram_chats_checked,
        api_errors: stats.api_errors
      }
    });
    
  } catch (error) {
    console.error("[CRON] Error in Telegram subscription verification:", error);
    
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json({
      success: false,
      processed_tasks: 0,
      unsubscribed_users: 0,
      penalties_applied: 0,
      total_bonus_deducted: 0,
      errors_count: 1,
      execution_time_ms: executionTime,
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * GET /api/cron/verify-telegram-tasks
 * Information endpoint for debugging
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Simple authorization check
  const authHeader = request.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");
  
  if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Get current statistics
  const { data: pendingTasks, count: pendingCount } = await supabaseServer
    .from("user_tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "rewarded")
    .eq("penalty_applied", false)
    .in("tasks.task_type", ["telegram_channel", "telegram_chat"]);
  
  const { data: appliedPenalties, count: penaltiesCount } = await supabaseServer
    .from("user_tasks")
    .select("id", { count: "exact", head: true })
    .eq("penalty_applied", true);
  
  // Calculate estimated processing time
  const estimatedApiCalls = Math.min(pendingCount || 0, CRON_CONFIG.MAX_TASKS_PER_RUN);
  const estimatedBatches = Math.ceil(estimatedApiCalls / CRON_CONFIG.TELEGRAM_RATE_LIMIT);
  const estimatedTimeSeconds = (estimatedBatches * CRON_CONFIG.BATCH_DELAY_MS) / 1000;
  
  return NextResponse.json({
    config: {
      telegram_rate_limit: CRON_CONFIG.TELEGRAM_RATE_LIMIT,
      batch_delay_ms: CRON_CONFIG.BATCH_DELAY_MS,
      max_tasks_per_run: CRON_CONFIG.MAX_TASKS_PER_RUN,
      max_api_calls: CRON_CONFIG.MAX_API_CALLS,
      execution_timeout_ms: CRON_CONFIG.EXECUTION_TIMEOUT_MS
    },
    statistics: {
      pending_verifications: pendingCount || 0,
      total_penalties_applied: penaltiesCount || 0,
      estimated_processing_time_seconds: estimatedTimeSeconds,
      runs_needed_for_all: Math.ceil((pendingCount || 0) / CRON_CONFIG.MAX_TASKS_PER_RUN)
    },
    recommendations: {
      cron_frequency: "Run every 10-15 minutes for optimal processing",
      note: "Each run processes up to 500 tasks within 25 second safety limit"
    },
    status: "Telegram subscription verification CRON endpoint is active",
    next_execution_url: `${request.nextUrl.origin}/api/cron/verify-telegram-tasks`
  });
}