// src/app/api/cron/restore-attempts/route.ts - Cron job для восстановления попыток с кнопкой игры

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase_server";

// ============================================================================
// СИСТЕМА ЛОКАЛИЗАЦИИ ДЛЯ УВЕДОМЛЕНИЙ
// Упрощенная логика: ru = русский язык, все остальные = английский
// ============================================================================

// Интерфейс для переводов уведомлений
interface NotificationTranslations {
  [key: string]: {
    notifications: {
      restored: {
        fullMessage: string;
        playButton: string;
      };
    };
  };
}

// Переводы для уведомлений о восстановлении попыток
const NOTIFICATION_TRANSLATIONS: NotificationTranslations = {
  en: {
    notifications: {
      restored: {
        fullMessage:
          "🎮 <b>Attempts Restored!</b>\n\nYo {firstName}! Your game attempts have been restored.\n\n⚡ <b>+{attemptsRestored} attempts</b> are now available!\n\nGo and play, buddy!",
        playButton: "🎮 Play Now",
      },
    },
  },
  ru: {
    notifications: {
      restored: {
        fullMessage:
          "🎮 <b>Попытки восстановлены!</b>\n\nЙоу, {firstName}! Твои игровые попытки были восстановлены.\n\n⚡ <b>+{attemptsRestored} попыток</b> теперь доступно!\n\nМож это, поиграем?",
        playButton: "🎮 Играть сейчас",
      },
    },
  },
};

// Функция для получения локализованного сообщения с расширенной отладкой
function getLocalizedMessage(
  languageCode: string | null,
  firstName: string,
  attemptsRestored: number,
): string {
  // Добавляем детальное логирование для отладки
  console.log(`[CRON_LOCALIZATION] Processing message for user: ${firstName}`);
  console.log(`[CRON_LOCALIZATION] Raw language_code: "${languageCode}"`);
  console.log(`[CRON_LOCALIZATION] Language_code type: ${typeof languageCode}`);
  console.log(
    `[CRON_LOCALIZATION] Language_code length: ${languageCode?.length || "null"}`,
  );

  // Безопасная нормализация языкового кода
  const normalizedLanguageCode = languageCode?.toString().toLowerCase().trim();

  console.log(
    `[CRON_LOCALIZATION] Normalized language_code: "${normalizedLanguageCode}"`,
  );

  // Упрощенная логика: если язык пользователя "ru" - русский, иначе - английский
  const useRussian = normalizedLanguageCode === "ru";
  const userLanguage = useRussian ? "ru" : "en";

  console.log(
    `[CRON_LOCALIZATION] Use Russian: ${useRussian}, Selected language: ${userLanguage}`,
  );

  // Получаем шаблон сообщения
  const messageTemplate =
    NOTIFICATION_TRANSLATIONS[userLanguage].notifications.restored.fullMessage;

  // Заменяем параметры в шаблоне
  const finalMessage = messageTemplate
    .replace("{firstName}", firstName)
    .replace("{attemptsRestored}", attemptsRestored.toString());

  console.log(
    `[CRON_LOCALIZATION] Final message preview: ${finalMessage.substring(0, 50)}...`,
  );

  return finalMessage;
}

// Функция для получения локализованного текста кнопки
function getLocalizedButtonText(languageCode: string | null): string {
  // Безопасная нормализация языкового кода
  const normalizedLanguageCode = languageCode?.toString().toLowerCase().trim();

  // Упрощенная логика: если язык пользователя "ru" - русский, иначе - английский
  const useRussian = normalizedLanguageCode === "ru";
  const userLanguage = useRussian ? "ru" : "en";

  return NOTIFICATION_TRANSLATIONS[userLanguage].notifications.restored
    .playButton;
}

// ============================================================================
const CRON_CONFIG = {
  // Количество попыток для восстановления
  RESET_ATTEMPTS: parseInt("10"),

  // Частота проверки (в минутах) - настраивается через ENV
  CHECK_FREQUENCY_MINUTES: parseInt("10"),

  // Максимальное количество пользователей за один запуск
  MAX_USERS_PER_RUN: parseInt("10000"),

  EXECUTION_TIMEOUT: parseInt("50"),

  CRON_API_KEY: process.env.CRON_API_KEY,

  // Telegram Bot Token
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_API,

  // URL для запуска игры
  GAME_START_URL: "https://t.me/marketaggregator_bot?startapp",
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

// User restoration result interface with localization support
interface RestorationResult {
  telegram_id: number;
  first_name: string;
  language_code: string | null;
  attempts_restored: number;
  notification_sent: boolean;
  error?: string;
}

/**
 * POST /api/cron/restore-attempts
 * Автоматическое восстановление попыток для пользователей с истекшим временем
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CronResponse>> {
  const startTime = Date.now();

  try {
    // Проверка авторизации cron job
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

    // Проверяем наличие Telegram Bot Token
    if (!CRON_CONFIG.TELEGRAM_BOT_TOKEN) {
      throw new Error("Telegram Bot Token not configured");
    }

    // Получаем пользователей с истекшим временем восстановления
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

    // Ограничиваем количество пользователей для обработки
    const usersToProcess = usersToRestore.slice(
      0,
      CRON_CONFIG.MAX_USERS_PER_RUN,
    );

    // Восстанавливаем попытки пользователям
    const restorationResults = await restoreAttemptsForUsers(usersToProcess);

    // Отправляем уведомления
    const notificationResults =
      await sendRestorationNotifications(restorationResults);

    // Подсчитываем расширенную статистику
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
 * Получение пользователей с истекшим временем восстановления (включая язык)
 */
async function getUsersWithExpiredResetTime() {
  const currentTime = new Date().toISOString();

  const { data, error } = await supabaseServer
    .from("users")
    .select(
      "id, telegram_id, first_name, language_code, attempts_remaining, attempts_reset_at",
    )
    .not("attempts_reset_at", "is", null)
    .lte("attempts_reset_at", currentTime)
    .eq("attempts_remaining", 0) // Только пользователи без попыток
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
 * Восстановление попыток для списка пользователей с поддержкой локализации
 */
async function restoreAttemptsForUsers(
  users: any[],
): Promise<RestorationResult[]> {
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
        console.error(
          `[CRON] Failed to restore attempts for user ${user.telegram_id}:`,
          error,
        );
        results.push({
          telegram_id: user.telegram_id,
          first_name: user.first_name,
          language_code: user.language_code,
          attempts_restored: 0,
          notification_sent: false,
          error: error.message,
        });
      } else {
        console.log(
          `[CRON] Attempts restored for user ${user.telegram_id}: ${CRON_CONFIG.RESET_ATTEMPTS} attempts`,
        );
        results.push({
          telegram_id: user.telegram_id,
          first_name: user.first_name,
          language_code: user.language_code,
          attempts_restored: CRON_CONFIG.RESET_ATTEMPTS,
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
        language_code: user.language_code,
        attempts_restored: 0,
        notification_sent: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Отправка уведомлений о восстановлении попыток с соблюдением лимитов Telegram API
 */
async function sendRestorationNotifications(
  restorationResults: RestorationResult[],
) {
  const notificationResults = [];
  const TELEGRAM_RATE_LIMIT = 25; // Сообщений в секунду (с запасом от лимита 30)
  const BATCH_DELAY_MS = 1100; // Задержка между группами (с запасом)

  // Фильтруем только пользователей с успешно восстановленными попытками
  const usersToNotify = restorationResults.filter(
    (result) => result.attempts_restored > 0,
  );

  console.log(
    `[CRON] Sending notifications to ${usersToNotify.length} users in batches of ${TELEGRAM_RATE_LIMIT}`,
  );

  // Разбиваем на группы для соблюдения rate limit
  for (let i = 0; i < usersToNotify.length; i += TELEGRAM_RATE_LIMIT) {
    const batch = usersToNotify.slice(i, i + TELEGRAM_RATE_LIMIT);
    const batchNumber = Math.floor(i / TELEGRAM_RATE_LIMIT) + 1;
    const totalBatches = Math.ceil(usersToNotify.length / TELEGRAM_RATE_LIMIT);

    console.log(
      `[CRON] Processing notification batch ${batchNumber}/${totalBatches} (${batch.length} users)`,
    );

    // Отправляем уведомления в текущей группе параллельно
    const batchPromises = batch.map(async (result) => {
      try {
        const notificationResult = await sendTelegramNotificationWithRetry(
          result.telegram_id,
          result.first_name,
          result.language_code, // Добавлен параметр language_code
          result.attempts_restored,
        );

        // Обновляем результат
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

    // Ожидаем завершения всех отправок в группе
    const batchResults = await Promise.all(batchPromises);

    notificationResults.push(...batchResults);

    // Задержка между группами для соблюдения rate limit (кроме последней группы)
    if (i + TELEGRAM_RATE_LIMIT < usersToNotify.length) {
      console.log(`[CRON] Waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // Добавляем результаты для пользователей без восстановленных попыток
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
 * Отправка уведомления в Telegram с повторными попытками и поддержкой локализации
 */
async function sendTelegramNotificationWithRetry(
  telegramId: number,
  firstName: string,
  languageCode: string | null,
  attemptsRestored: number,
  maxRetries: number = 3,
): Promise<{ success: boolean; error?: string; blocked_by_user?: boolean }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendTelegramNotification(
        telegramId,
        firstName,
        languageCode,
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
        // Пользователь заблокировал бота - повторные попытки бесполезны
        console.log(
          `[CRON] User ${telegramId} has blocked the bot - skipping further attempts`,
        );

        return {
          success: false,
          blocked_by_user: true,
          error: "User blocked bot",
        };
      } else if (result.rate_limited) {
        // Rate limit - ждем перед повторной попыткой
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s

        console.log(
          `[CRON] Rate limited for user ${telegramId}, waiting ${delayMs}ms before retry ${attempt}/${maxRetries}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      } else {
        // Другие ошибки - логируем и пробуем еще раз
        console.warn(
          `[CRON] Notification attempt ${attempt}/${maxRetries} failed for user ${telegramId}: ${result.error}`,
        );
        if (attempt < maxRetries) {
          const delayMs = 500 * attempt; // Линейная задержка для других ошибок

          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    } catch (error) {
      console.error(
        `[CRON] Network error on attempt ${attempt}/${maxRetries} for user ${telegramId}:`,
        error,
      );
      if (attempt < maxRetries) {
        const delayMs = 1000 * attempt; // Увеличенная задержка для сетевых ошибок

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
 * Отправка локализованного уведомления в Telegram с inline кнопкой для игры
 */
async function sendTelegramNotification(
  telegramId: number,
  firstName: string,
  languageCode: string | null,
  attemptsRestored: number,
): Promise<{
  success: boolean;
  error?: string;
  blocked_by_user?: boolean;
  rate_limited?: boolean;
}> {
  // Добавляем логирование входящих параметров
  console.log(
    `[CRON_NOTIFICATION] Sending to user ${telegramId} (${firstName})`,
  );
  console.log(`[CRON_NOTIFICATION] Language code received: "${languageCode}"`);

  // Получаем локализованное сообщение и текст кнопки
  const message = getLocalizedMessage(
    languageCode,
    firstName,
    attemptsRestored,
  );
  const buttonText = getLocalizedButtonText(languageCode);

  const telegramApiUrl = `https://api.telegram.org/bot${CRON_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;

  // Создаем inline клавиатуру с кнопкой для игры
  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: buttonText,
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
        `[CRON_NOTIFICATION] Successfully sent localized message with game button to user ${telegramId}`,
      );

      return { success: true };
    } else {
      const errorCode = result.error_code;
      const description = result.description || "Unknown Telegram API error";

      // Обработка специфических ошибок Telegram API
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
        // Аккаунт удален или недоступен
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
      game_start_url: CRON_CONFIG.GAME_START_URL,
    },
    status: "Cron job endpoint is active",
    next_execution_url: `${request.nextUrl.origin}/api/cron/restore-attempts`,
  });
}
