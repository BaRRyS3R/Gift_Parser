// src/app/api/cron/restore-attempts/route.ts - Cron job для восстановления попыток

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase_server";

// ============================================================================
// КОНФИГУРАЦИЯ СИСТЕМЫ CRON - Настройки из переменных окружения
// ============================================================================
const CRON_CONFIG = {
  // Количество попыток для восстановления
  RESET_ATTEMPTS: parseInt("10"),
  
  // Частота проверки (в минутах) - настраивается через ENV
  CHECK_FREQUENCY_MINUTES: parseInt("2"),
  
  // Максимальное количество пользователей за один запуск
  MAX_USERS_PER_RUN: parseInt("30"),
  
  // Таймаут для одного запуска (в секундах)
  EXECUTION_TIMEOUT: parseInt("50"),
  
  // API ключ для авторизации cron запросов (ОБЯЗАТЕЛЬНО настроить в ENV!)
  CRON_API_KEY: process.env.CRON_API_KEY,
  
  // Telegram Bot Token
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_API,
  
} as const;

// ============================================================================

// Response interface
interface CronResponse {
  success: boolean;
  processed_users: number;
  restored_attempts: number;
  notifications_sent: number;
  failed_notifications: number;
  execution_time_ms: number;
  next_check_in_minutes: number;
  error?: string;
}

// User restoration result interface
interface RestorationResult {
  telegram_id: number;
  first_name: string;
  attempts_restored: number;
  notification_sent: boolean;
  error?: string;
}

/**
 * POST /api/cron/restore-attempts
 * Автоматическое восстановление попыток для пользователей с истекшим временем
 */
export async function POST(request: NextRequest): Promise<NextResponse<CronResponse>> {
  const startTime = Date.now();
  
  try {
    // Проверка авторизации cron job
    const authHeader = request.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");
    
    if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
      console.log("[CRON] Unauthorized attempt to access restore-attempts endpoint");
      return NextResponse.json(
        {
          success: false,
          processed_users: 0,
          restored_attempts: 0,
          notifications_sent: 0,
          failed_notifications: 0,
          execution_time_ms: Date.now() - startTime,
          next_check_in_minutes: CRON_CONFIG.CHECK_FREQUENCY_MINUTES,
          error: "Unauthorized access",
        },
        { status: 401 }
      );
    }

    console.log("[CRON] Starting attempts restoration process");

    // Проверяем наличие Telegram Bot Token
    if (!CRON_CONFIG.TELEGRAM_BOT_TOKEN) {
      throw new Error("Telegram Bot Token not configured");
    }

    // Получаем пользователей с истекшим временем восстановления
    const usersToRestore = await getUsersWithExpiredResetTime();
    
    console.log(`[CRON] Found ${usersToRestore.length} users with expired reset time`);

    if (usersToRestore.length === 0) {
      return NextResponse.json({
        success: true,
        processed_users: 0,
        restored_attempts: 0,
        notifications_sent: 0,
        failed_notifications: 0,
        execution_time_ms: Date.now() - startTime,
        next_check_in_minutes: CRON_CONFIG.CHECK_FREQUENCY_MINUTES,
      });
    }

    // Ограничиваем количество пользователей для обработки
    const usersToProcess = usersToRestore.slice(0, CRON_CONFIG.MAX_USERS_PER_RUN);
    
    // Восстанавливаем попытки пользователям
    const restorationResults = await restoreAttemptsForUsers(usersToProcess);
    
    // Отправляем уведомления
    const notificationResults = await sendRestorationNotifications(restorationResults);
    
    // Подсчитываем статистику
    const totalRestored = restorationResults.reduce((sum, result) => sum + result.attempts_restored, 0);
    const successfulNotifications = notificationResults.filter(result => result.success).length;
    const failedNotifications = notificationResults.filter(result => !result.success).length;
    
    const executionTime = Date.now() - startTime;
    
    console.log(`[CRON] Restoration completed: ${usersToProcess.length} users processed, ${totalRestored} attempts restored, ${successfulNotifications} notifications sent`);

    return NextResponse.json({
      success: true,
      processed_users: usersToProcess.length,
      restored_attempts: totalRestored,
      notifications_sent: successfulNotifications,
      failed_notifications: failedNotifications,
      execution_time_ms: executionTime,
      next_check_in_minutes: CRON_CONFIG.CHECK_FREQUENCY_MINUTES,
    });

  } catch (error) {
    console.error("[CRON] Error in attempts restoration:", error);
    
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        processed_users: 0,
        restored_attempts: 0,
        notifications_sent: 0,
        failed_notifications: 0,
        execution_time_ms: executionTime,
        next_check_in_minutes: CRON_CONFIG.CHECK_FREQUENCY_MINUTES,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Получение пользователей с истекшим временем восстановления
 */
async function getUsersWithExpiredResetTime() {
  const currentTime = new Date().toISOString();
  
  const { data, error } = await supabaseServer
    .from("users")
    .select("id, telegram_id, first_name, attempts_remaining, attempts_reset_at")
    .not("attempts_reset_at", "is", null)
    .lte("attempts_reset_at", currentTime)
    .eq("attempts_remaining", 0) // Только пользователи без попыток
    .limit(CRON_CONFIG.MAX_USERS_PER_RUN);

  if (error) {
    console.error("[CRON] Error fetching users with expired reset time:", error);
    throw new Error("Failed to fetch users with expired reset time");
  }

  return data || [];
}

/**
 * Восстановление попыток для списка пользователей
 */
async function restoreAttemptsForUsers(users: any[]): Promise<RestorationResult[]> {
  const results: RestorationResult[] = [];
  const currentTime = new Date().toISOString();

  for (const user of users) {
    try {
      // Обновляем попытки пользователя
      const { error } = await supabaseServer
        .from("users")
        .update({
          attempts_remaining: CRON_CONFIG.RESET_ATTEMPTS,
          attempts_reset_at: null, // Сбрасываем время следующего восстановления
          updated_at: currentTime,
        })
        .eq("telegram_id", user.telegram_id);

      if (error) {
        console.error(`[CRON] Failed to restore attempts for user ${user.telegram_id}:`, error);
        results.push({
          telegram_id: user.telegram_id,
          first_name: user.first_name,
          attempts_restored: 0,
          notification_sent: false,
          error: error.message,
        });
      } else {
        console.log(`[CRON] Attempts restored for user ${user.telegram_id}: ${CRON_CONFIG.RESET_ATTEMPTS} attempts`);
        results.push({
          telegram_id: user.telegram_id,
          first_name: user.first_name,
          attempts_restored: CRON_CONFIG.RESET_ATTEMPTS,
          notification_sent: false,
        });
      }
    } catch (error) {
      console.error(`[CRON] Unexpected error restoring attempts for user ${user.telegram_id}:`, error);
      results.push({
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        attempts_restored: 0,
        notification_sent: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Отправка уведомлений о восстановлении попыток
 */
async function sendRestorationNotifications(restorationResults: RestorationResult[]) {
  const notificationResults = [];

  for (const result of restorationResults) {
    // Пропускаем пользователей, для которых не удалось восстановить попытки
    if (result.attempts_restored === 0) {
      notificationResults.push({ telegram_id: result.telegram_id, success: false, error: "No attempts restored" });
      continue;
    }

    try {
      const notificationSent = await sendTelegramNotification(result.telegram_id, result.first_name, result.attempts_restored);
      
      notificationResults.push({
        telegram_id: result.telegram_id,
        success: notificationSent,
        error: notificationSent ? undefined : "Failed to send notification"
      });

      // Обновляем результат
      result.notification_sent = notificationSent;

    } catch (error) {
      console.error(`[CRON] Error sending notification to user ${result.telegram_id}:`, error);
      notificationResults.push({
        telegram_id: result.telegram_id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return notificationResults;
}

/**
 * Отправка уведомления в Telegram
 */
async function sendTelegramNotification(telegramId: number, firstName: string, attemptsRestored: number): Promise<boolean> {
  const message = `⚡ <b>Attempts Restored!</b>\n\nHi ${firstName}! Your game attempts have been restored.\n\n🎮 <b>+${attemptsRestored} attempts</b> are now available!\n\nYou can continue playing your favorite games. Good luck! 🍀`;

  const telegramApiUrl = `https://api.telegram.org/bot${CRON_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
  
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
      }),
    });

    const result = await response.json();

    if (result.ok) {
      console.log(`[CRON] Notification sent successfully to user ${telegramId}`);
      return true;
    } else {
      console.error(`[CRON] Telegram API error for user ${telegramId}:`, result.description);
      return false;
    }
  } catch (error) {
    console.error(`[CRON] Network error sending notification to user ${telegramId}:`, error);
    return false;
  }
}

/**
 * GET /api/cron/restore-attempts
 * Информация о конфигурации cron job (для отладки)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Простая проверка авторизации для GET запроса
  const authHeader = request.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");
  
  if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    config: {
      check_frequency_minutes: CRON_CONFIG.CHECK_FREQUENCY_MINUTES,
      reset_attempts: CRON_CONFIG.RESET_ATTEMPTS,
      max_users_per_run: CRON_CONFIG.MAX_USERS_PER_RUN,
      execution_timeout: CRON_CONFIG.EXECUTION_TIMEOUT,
    },
    status: "Cron job endpoint is active",
    next_execution_url: `${request.nextUrl.origin}/api/cron/restore-attempts`,
  });
}