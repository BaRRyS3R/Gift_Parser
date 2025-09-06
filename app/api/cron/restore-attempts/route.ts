// src/app/api/cron/restore-attempts/route.ts - Simplified with English-only notifications

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase_server";

// Static English notification messages
const NOTIFICATION_MESSAGE = (firstName: string, attemptsRestored: number) =>
  `🎮 <b>Attempts Restored!</b>\n\nYo ${firstName}! Your game attempts have been restored.\n\n⚡ <b>+${attemptsRestored} attempts</b> are now available!\n\nGo and play, buddy!`;

const PLAY_BUTTON_TEXT = "🎮 Play";

const CRON_CONFIG = {
  // Base number of attempts for restoration (will be supplemented with bonus)
  BASE_RESET_ATTEMPTS: parseInt("10"),

  // Check frequency in minutes - configurable via ENV
  CHECK_FREQUENCY_MINUTES: parseInt("10"),

  // Maximum number of users per run
  MAX_USERS_PER_RUN: parseInt("10000"),

  EXECUTION_TIMEOUT: parseInt("50"),

  CRON_API_KEY: process.env.CRON_API_KEY,

  // Telegram Bot Token
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_API,

  // URL for starting the game
  GAME_START_URL: "https://t.me/circusle_bot?startapp",
} as const;

// Response interface
interface CronResponse {
  success: boolean;
  processed_users: number;
  restored_attempts: number;
  notifications_sent: number;
  failed_notifications: number;
  blocked_by_users: number;
  rate_limited_failures: number;
  execution_time_ms: number;
  next_check_in_minutes: number;
  error?: string;
}

// User restoration result interface
interface RestorationResult {
  telegram_id: number;
  first_name: string;
  bonus_restore_attempts: number;
  attempts_restored: number;
  notification_sent: boolean;
  error?: string;
}

// Helper function to calculate restore amount for a user
function calculateUserRestoreAmount(bonusRestoreAttempts: number): number {
  return CRON_CONFIG.BASE_RESET_ATTEMPTS + (bonusRestoreAttempts || 0);
}

/**
 * POST /api/cron/restore-attempts
 * Automatic attempt restoration for users with expired reset time
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CronResponse>> {
  const startTime = Date.now();

  try {
    // Verify cron job authorization
    const authHeader = request.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
      console.warn(
        "[CRON] Unauthorized attempt to access restore-attempts endpoint",
      );

      return NextResponse.json(
        {
          success: false,
          processed_users: 0,
          restored_attempts: 0,
          notifications_sent: 0,
          failed_notifications: 0,
          blocked_by_users: 0,
          rate_limited_failures: 0,
          execution_time_ms: Date.now() - startTime,
          next_check_in_minutes: CRON_CONFIG.CHECK_FREQUENCY_MINUTES,
          error: "Unauthorized access",
        },
        { status: 401 },
      );
    }

    console.log("[CRON] Starting attempts restoration process");

    // Verify Telegram Bot Token configuration
    if (!CRON_CONFIG.TELEGRAM_BOT_TOKEN) {
      throw new Error("Telegram Bot Token not configured");
    }

    // Get users with expired reset time
    const usersToRestore = await getUsersWithExpiredResetTime();

    console.log(
      `[CRON] Found ${usersToRestore.length} users with expired reset time`,
    );

    if (usersToRestore.length === 0) {
      return NextResponse.json({
        success: true,
        processed_users: 0,
        restored_attempts: 0,
        notifications_sent: 0,
        failed_notifications: 0,
        blocked_by_users: 0,
        rate_limited_failures: 0,
        execution_time_ms: Date.now() - startTime,
        next_check_in_minutes: CRON_CONFIG.CHECK_FREQUENCY_MINUTES,
      });
    }

    // Limit the number of users to process
    const usersToProcess = usersToRestore.slice(
      0,
      CRON_CONFIG.MAX_USERS_PER_RUN,
    );

    // Restore attempts for users with bonus consideration
    const restorationResults = await restoreAttemptsForUsers(usersToProcess);

    // Send notifications
    const notificationResults =
      await sendRestorationNotifications(restorationResults);

    // Calculate detailed statistics
    const totalRestored = restorationResults.reduce(
      (sum, result) => sum + result.attempts_restored,
      0,
    );
    const successfulNotifications = notificationResults.filter(
      (result) => result.success,
    ).length;
    const blockedByUsers = notificationResults.filter(
      (result) => result.blocked_by_user,
    ).length;
    const rateLimitedFailures = notificationResults.filter(
      (result) => !result.success && result.error?.includes("rate limit"),
    ).length;
    const otherFailures = notificationResults.filter(
      (result) =>
        !result.success &&
        !result.blocked_by_user &&
        !result.error?.includes("rate limit"),
    ).length;

    const executionTime = Date.now() - startTime;

    console.log(
      `[CRON] Restoration completed: ${usersToProcess.length} users processed, ${totalRestored} attempts restored`,
    );
    console.log(
      `[CRON] Notifications: ${successfulNotifications} sent, ${blockedByUsers} blocked, ${rateLimitedFailures} rate limited, ${otherFailures} other failures`,
    );

    return NextResponse.json({
      success: true,
      processed_users: usersToProcess.length,
      restored_attempts: totalRestored,
      notifications_sent: successfulNotifications,
      failed_notifications: otherFailures,
      blocked_by_users: blockedByUsers,
      rate_limited_failures: rateLimitedFailures,
      execution_time_ms: executionTime,
      next_check_in_minutes: CRON_CONFIG.CHECK_FREQUENCY_MINUTES,
    });
  } catch (error) {
    console.error("[CRON] Error in attempts restoration:", error);

    const executionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        processed_users: 0,
        restored_attempts: 0,
        notifications_sent: 0,
        failed_notifications: 0,
        blocked_by_users: 0,
        rate_limited_failures: 0,
        execution_time_ms: executionTime,
        next_check_in_minutes: CRON_CONFIG.CHECK_FREQUENCY_MINUTES,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}

/**
 * Get users with expired reset time including bonus_restore_attempts
 */
async function getUsersWithExpiredResetTime() {
  const currentTime = new Date().toISOString();

  const { data, error } = await supabaseServer
    .from("users")
    .select(
      "id, telegram_id, first_name, attempts_remaining, attempts_reset_at, bonus_restore_attempts",
    )
    .not("attempts_reset_at", "is", null)
    .lte("attempts_reset_at", currentTime)
    .eq("attempts_remaining", 0) // Only users without attempts
    .limit(CRON_CONFIG.MAX_USERS_PER_RUN);

  if (error) {
    console.error(
      "[CRON] Error fetching users with expired reset time:",
      error,
    );
    throw new Error("Failed to fetch users with expired reset time");
  }

  return data || [];
}

/**
 * Restore attempts for list of users with bonus attempts support
 */
async function restoreAttemptsForUsers(
  users: any[],
): Promise<RestorationResult[]> {
  const results: RestorationResult[] = [];
  const currentTime = new Date().toISOString();

  for (const user of users) {
    try {
      // Calculate the number of attempts to restore including bonus
      const userRestoreAmount = calculateUserRestoreAmount(
        user.bonus_restore_attempts,
      );

      console.log(
        `[CRON] Restoring attempts for user ${user.telegram_id}: base=${CRON_CONFIG.BASE_RESET_ATTEMPTS}, bonus=${user.bonus_restore_attempts || 0}, total=${userRestoreAmount}`,
      );

      // Update user attempts
      const { error } = await supabaseServer
        .from("users")
        .update({
          attempts_remaining: userRestoreAmount,
          attempts_reset_at: null, // Reset next restoration time
          updated_at: currentTime,
        })
        .eq("telegram_id", user.telegram_id);

      if (error) {
        console.error(
          `[CRON] Failed to restore attempts for user ${user.telegram_id}:`,
          error,
        );
        results.push({
          telegram_id: user.telegram_id,
          first_name: user.first_name,
          bonus_restore_attempts: user.bonus_restore_attempts || 0,
          attempts_restored: 0,
          notification_sent: false,
          error: error.message,
        });
      } else {
        console.log(
          `[CRON] Attempts restored for user ${user.telegram_id}: ${userRestoreAmount} attempts`,
        );
        results.push({
          telegram_id: user.telegram_id,
          first_name: user.first_name,
          bonus_restore_attempts: user.bonus_restore_attempts || 0,
          attempts_restored: userRestoreAmount,
          notification_sent: false,
        });
      }
    } catch (error) {
      console.error(
        `[CRON] Unexpected error restoring attempts for user ${user.telegram_id}:`,
        error,
      );
      results.push({
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        bonus_restore_attempts: user.bonus_restore_attempts || 0,
        attempts_restored: 0,
        notification_sent: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Send restoration notifications with Telegram API rate limit compliance
 */
async function sendRestorationNotifications(
  restorationResults: RestorationResult[],
) {
  const notificationResults = [];
  const TELEGRAM_RATE_LIMIT = 25; // Messages per second (with buffer from 30 limit)
  const BATCH_DELAY_MS = 1100; // Delay between batches (with buffer)

  // Filter only users with successfully restored attempts
  const usersToNotify = restorationResults.filter(
    (result) => result.attempts_restored > 0,
  );

  console.log(
    `[CRON] Sending notifications to ${usersToNotify.length} users in batches of ${TELEGRAM_RATE_LIMIT}`,
  );

  // Split into batches for rate limit compliance
  for (let i = 0; i < usersToNotify.length; i += TELEGRAM_RATE_LIMIT) {
    const batch = usersToNotify.slice(i, i + TELEGRAM_RATE_LIMIT);
    const batchNumber = Math.floor(i / TELEGRAM_RATE_LIMIT) + 1;
    const totalBatches = Math.ceil(usersToNotify.length / TELEGRAM_RATE_LIMIT);

    console.log(
      `[CRON] Processing notification batch ${batchNumber}/${totalBatches} (${batch.length} users)`,
    );

    // Send notifications in current batch in parallel
    const batchPromises = batch.map(async (result) => {
      try {
        const notificationResult = await sendTelegramNotificationWithRetry(
          result.telegram_id,
          result.first_name,
          result.attempts_restored, // Use actual number of restored attempts
        );

        // Update result
        result.notification_sent = notificationResult.success;

        return {
          telegram_id: result.telegram_id,
          success: notificationResult.success,
          error: notificationResult.error,
          blocked_by_user: notificationResult.blocked_by_user || false,
        };
      } catch (error) {
        console.error(
          `[CRON] Unexpected error sending notification to user ${result.telegram_id}:`,
          error,
        );

        return {
          telegram_id: result.telegram_id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          blocked_by_user: false,
        };
      }
    });

    // Wait for all sends in batch to complete
    const batchResults = await Promise.all(batchPromises);

    notificationResults.push(...batchResults);

    // Delay between batches for rate limit compliance (except last batch)
    if (i + TELEGRAM_RATE_LIMIT < usersToNotify.length) {
      console.log(`[CRON] Waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // Add results for users without restored attempts
  const skippedUsers = restorationResults.filter(
    (result) => result.attempts_restored === 0,
  );

  skippedUsers.forEach((result) => {
    notificationResults.push({
      telegram_id: result.telegram_id,
      success: false,
      error: "No attempts restored",
      blocked_by_user: false,
    });
  });

  const successfulNotifications = notificationResults.filter(
    (r) => r.success,
  ).length;
  const blockedByUsers = notificationResults.filter(
    (r) => r.blocked_by_user,
  ).length;
  const otherFailures = notificationResults.filter(
    (r) => !r.success && !r.blocked_by_user,
  ).length;

  console.log(
    `[CRON] Notification summary: ${successfulNotifications} sent, ${blockedByUsers} blocked by users, ${otherFailures} other failures`,
  );

  return notificationResults;
}

/**
 * Send Telegram notification with retries
 */
async function sendTelegramNotificationWithRetry(
  telegramId: number,
  firstName: string,
  attemptsRestored: number,
  maxRetries: number = 3,
): Promise<{ success: boolean; error?: string; blocked_by_user?: boolean }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendTelegramNotification(
        telegramId,
        firstName,
        attemptsRestored,
      );

      if (result.success) {
        if (attempt > 1) {
          console.log(
            `[CRON] Notification sent successfully to user ${telegramId} on attempt ${attempt}`,
          );
        }

        return { success: true };
      } else if (result.blocked_by_user) {
        // User blocked bot - retries are useless
        console.log(
          `[CRON] User ${telegramId} has blocked the bot - skipping further attempts`,
        );

        return {
          success: false,
          blocked_by_user: true,
          error: "User blocked bot",
        };
      } else if (result.rate_limited) {
        // Rate limit - wait before retry
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s

        console.log(
          `[CRON] Rate limited for user ${telegramId}, waiting ${delayMs}ms before retry ${attempt}/${maxRetries}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      } else {
        // Other errors - log and try again
        console.warn(
          `[CRON] Notification attempt ${attempt}/${maxRetries} failed for user ${telegramId}: ${result.error}`,
        );
        if (attempt < maxRetries) {
          const delayMs = 500 * attempt; // Linear delay for other errors

          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    } catch (error) {
      console.error(
        `[CRON] Network error on attempt ${attempt}/${maxRetries} for user ${telegramId}:`,
        error,
      );
      if (attempt < maxRetries) {
        const delayMs = 1000 * attempt; // Increased delay for network errors

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  return {
    success: false,
    error: `Failed after ${maxRetries} attempts`,
  };
}

/**
 * Send English notification to Telegram with inline game button
 */
async function sendTelegramNotification(
  telegramId: number,
  firstName: string,
  attemptsRestored: number,
): Promise<{
  success: boolean;
  error?: string;
  blocked_by_user?: boolean;
  rate_limited?: boolean;
}> {
  console.log(
    `[CRON_NOTIFICATION] Sending to user ${telegramId} (${firstName}) - ${attemptsRestored} attempts restored`,
  );

  const message = NOTIFICATION_MESSAGE(firstName, attemptsRestored);
  const telegramApiUrl = `https://api.telegram.org/bot${CRON_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;

  // Create inline keyboard with game button
  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: PLAY_BUTTON_TEXT,
          url: CRON_CONFIG.GAME_START_URL,
        },
      ],
    ],
  };

  try {
    const response = await fetch(telegramApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      }),
    });

    const result = await response.json();

    if (result.ok) {
      console.log(
        `[CRON_NOTIFICATION] Successfully sent message with game button to user ${telegramId}`,
      );

      return { success: true };
    } else {
      const errorCode = result.error_code;
      const description = result.description || "Unknown Telegram API error";

      // Handle specific Telegram API errors
      if (errorCode === 403) {
        if (
          description.includes("bot was blocked") ||
          description.includes("user is deactivated")
        ) {
          return {
            success: false,
            blocked_by_user: true,
            error: description,
          };
        }
      } else if (errorCode === 429) {
        // Rate limiting
        return {
          success: false,
          rate_limited: true,
          error: description,
        };
      } else if (errorCode === 400 && description.includes("chat not found")) {
        // Account deleted or unavailable
        return {
          success: false,
          blocked_by_user: true,
          error: "Chat not found - user account may be deleted",
        };
      }

      return {
        success: false,
        error: `Telegram API error ${errorCode}: ${description}`,
      };
    }
  } catch (error) {
    console.error(
      `[CRON_NOTIFICATION] Network error for user ${telegramId}:`,
      error,
    );

    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * GET /api/cron/restore-attempts
 * Information about cron job configuration for debugging
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Simple authorization check for GET request
  const authHeader = request.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");

  if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    config: {
      check_frequency_minutes: CRON_CONFIG.CHECK_FREQUENCY_MINUTES,
      base_reset_attempts: CRON_CONFIG.BASE_RESET_ATTEMPTS,
      max_users_per_run: CRON_CONFIG.MAX_USERS_PER_RUN,
      execution_timeout: CRON_CONFIG.EXECUTION_TIMEOUT,
      game_start_url: CRON_CONFIG.GAME_START_URL,
    },
    status: "Cron job endpoint is active with bonus restore attempts support - English only",
    next_execution_url: `${request.nextUrl.origin}/api/cron/restore-attempts`,
  });
}