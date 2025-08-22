// src/app/api/cron/cleanup-sessions/route.ts - API для внешнего CRON сервиса с улучшенной диагностикой

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase_server";

// ============================================================================
// КОНФИГУРАЦИЯ CRON API
// ============================================================================

const CRON_CONFIG = {
  // API ключ для авторизации внешнего CRON сервиса
  CRON_API_KEY: process.env.CRON_API_KEY,

  // Максимальное количество сессий для очистки за один запуск
  MAX_SESSIONS_PER_RUN: 5000,

  // Grace period перед очисткой (в минутах)
  GRACE_PERIOD_MINUTES: 1,
} as const;

// Response interface
interface CleanupResponse {
  success: boolean;
  sessions_cleaned: number;
  execution_time_ms: number;
  timestamp: string;
  error?: string;
}

/**
 * POST /api/cron/cleanup-sessions
 * Очистка истекших игровых сессий для внешнего CRON сервиса
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CleanupResponse>> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Детальное логирование для диагностики
  console.log("[CRON_CLEANUP] ========================================");
  console.log("[CRON_CLEANUP] Starting cleanup request at", timestamp);
  console.log("[CRON_CLEANUP] Request headers:", {
    userAgent: request.headers.get("User-Agent"),
    contentType: request.headers.get("Content-Type"),
    authorization: request.headers.get("Authorization") ? "Bearer ***" : "No auth header",
    origin: request.headers.get("Origin"),
    host: request.headers.get("Host"),
  });

  try {
    // Проверяем наличие API ключа в переменных окружения
    if (!CRON_CONFIG.CRON_API_KEY) {
      console.error("[CRON_CLEANUP] CRON_API_KEY not configured in environment");
      
      return NextResponse.json(
        {
          success: false,
          sessions_cleaned: 0,
          execution_time_ms: Date.now() - startTime,
          timestamp,
          error: "CRON API key not configured",
        },
        { status: 500 },
      );
    }

    // Проверка авторизации CRON сервиса
    const authHeader = request.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    console.log("[CRON_CLEANUP] Auth check:", {
      hasAuthHeader: !!authHeader,
      keyLength: apiKey?.length || 0,
      expectedKeyLength: CRON_CONFIG.CRON_API_KEY.length,
    });

    if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
      console.warn("[CRON_CLEANUP] Unauthorized access attempt:", {
        providedKey: apiKey ? `${apiKey.substring(0, 8)}...` : "none",
        expectedKey: `${CRON_CONFIG.CRON_API_KEY.substring(0, 8)}...`,
      });

      return NextResponse.json(
        {
          success: false,
          sessions_cleaned: 0,
          execution_time_ms: Date.now() - startTime,
          timestamp,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    console.log("[CRON_CLEANUP] Authorization successful, starting cleanup");

    // Проверяем подключение к базе данных
    try {
      const healthCheck = await supabaseServer
        .from("game_sessions")
        .select("session_id", { count: "exact" })
        .limit(1);

      if (healthCheck.error) {
        console.error("[CRON_CLEANUP] Database health check failed:", healthCheck.error);
        throw new Error(`Database connection failed: ${healthCheck.error.message}`);
      }

      console.log("[CRON_CLEANUP] Database connection healthy");
    } catch (dbError) {
      console.error("[CRON_CLEANUP] Database health check exception:", dbError);
      throw new Error(`Database health check failed: ${dbError instanceof Error ? dbError.message : "Unknown error"}`);
    }

    // Выполняем очистку истекших сессий
    const cleanedCount = await cleanupExpiredSessions();

    const executionTime = Date.now() - startTime;

    console.log(
      `[CRON_CLEANUP] Completed successfully: ${cleanedCount} sessions cleaned in ${executionTime}ms`,
    );
    console.log("[CRON_CLEANUP] ========================================");

    return NextResponse.json({
      success: true,
      sessions_cleaned: cleanedCount,
      execution_time_ms: executionTime,
      timestamp,
    });
  } catch (error) {
    console.error("[CRON_CLEANUP] Error occurred:", error);
    console.error("[CRON_CLEANUP] Error stack:", error instanceof Error ? error.stack : "No stack trace");

    const executionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.log("[CRON_CLEANUP] ========================================");

    return NextResponse.json(
      {
        success: false,
        sessions_cleaned: 0,
        execution_time_ms: executionTime,
        timestamp,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}

/**
 * ФИЗИЧЕСКОЕ УДАЛЕНИЕ всех истёкших сессий (любого статуса)
 */
async function cleanupExpiredSessions(): Promise<number> {
  console.log("[CRON_CLEANUP] Starting cleanupExpiredSessions function");
  
  try {
    // Рассчитываем время с учетом grace period
    const currentTime = new Date();
    const graceTime = new Date();
    graceTime.setMinutes(
      graceTime.getMinutes() - CRON_CONFIG.GRACE_PERIOD_MINUTES,
    );

    console.log("[CRON_CLEANUP] Time calculations:", {
      currentTime: currentTime.toISOString(),
      graceTime: graceTime.toISOString(),
      gracePeriodMinutes: CRON_CONFIG.GRACE_PERIOD_MINUTES,
    });

    // 🔍 ДИАГНОСТИКА: Проверяем ВСЕ сессии в базе
    console.log("[CRON_CLEANUP] === ДИАГНОСТИКА ВСЕХ СЕССИЙ ===");
    
    const { data: allSessions, error: allSessionsError } = await supabaseServer
      .from("game_sessions")
      .select("session_id, status, expires_at, created_at")
      .order("expires_at", { ascending: true });

    if (allSessionsError) {
      console.error("[CRON_CLEANUP] Error getting all sessions:", allSessionsError);
    } else {
      console.log("[CRON_CLEANUP] All sessions in database:", allSessions?.length || 0);
      
      allSessions?.forEach((session, index) => {
        const expiresAt = new Date(session.expires_at);
        const isExpired = expiresAt < graceTime;
        
        console.log(`[CRON_CLEANUP] Session ${index + 1}:`, {
          session_id: session.session_id.substring(0, 8) + "...",
          status: session.status,
          expires_at: session.expires_at,
          is_expired: isExpired,
          will_delete: isExpired,
          time_diff_minutes: Math.round((graceTime.getTime() - expiresAt.getTime()) / (1000 * 60)),
        });
      });
    }

    // 🔍 ДИАГНОСТИКА: Показываем что будет удалено
    console.log("[CRON_CLEANUP] === ПОИСК ВСЕХ ИСТЁКШИХ СЕССИЙ ДЛЯ УДАЛЕНИЯ ===");
    
    const { data: expiredSessions, error: expiredError } = await supabaseServer
      .from("game_sessions")
      .select("session_id, status, expires_at, created_at")
      .lt("expires_at", graceTime.toISOString());

    if (expiredError) {
      console.error("[CRON_CLEANUP] Error getting expired sessions:", expiredError);
      throw new Error(`Failed to get expired sessions: ${expiredError.message}`);
    }

    console.log("[CRON_CLEANUP] Sessions to DELETE (all expired):", expiredSessions?.length || 0);
    
    expiredSessions?.forEach((session, index) => {
      console.log(`[CRON_CLEANUP] Will DELETE session ${index + 1}:`, {
        session_id: session.session_id.substring(0, 8) + "...",
        status: session.status,
        expires_at: session.expires_at,
        created_at: session.created_at,
      });
    });

    if ((expiredSessions?.length || 0) === 0) {
      console.log("[CRON_CLEANUP] === NO SESSIONS TO DELETE - ALL GOOD ===");
      return 0;
    }

    // 🗑️ ФИЗИЧЕСКОЕ УДАЛЕНИЕ - полностью удаляем из базы
    console.log("[CRON_CLEANUP] Starting PHYSICAL DELETION from database...");
    
    const deleteResult = await supabaseServer
      .from("game_sessions")
      .delete()
      .lt("expires_at", graceTime.toISOString());

    console.log("[CRON_CLEANUP] Physical deletion completed:", {
      count: deleteResult.count,
      error: deleteResult.error,
      status: deleteResult.status,
      statusText: deleteResult.statusText,
    });

    if (deleteResult.error) {
      console.error("[CRON_CLEANUP] Physical deletion error:", {
        message: deleteResult.error.message,
        details: deleteResult.error.details,
        hint: deleteResult.error.hint,
        code: deleteResult.error.code,
      });
      throw new Error(`Failed to delete expired sessions: ${deleteResult.error.message}`);
    }

    const deletedCount = deleteResult.count || 0;
    console.log("[CRON_CLEANUP] Successfully DELETED sessions from database:", deletedCount);

    // 🔍 ВЕРИФИКАЦИЯ: Проверяем что осталось в базе
    console.log("[CRON_CLEANUP] === ВЕРИФИКАЦИЯ ПОСЛЕ УДАЛЕНИЯ ===");
    
    const { data: remainingSessions, error: remainingError } = await supabaseServer
      .from("game_sessions")
      .select("session_id, status, expires_at", { count: "exact" });

    if (!remainingError) {
      console.log("[CRON_CLEANUP] Sessions remaining in database:", remainingSessions?.length || 0);
      
      remainingSessions?.forEach((session, index) => {
        console.log(`[CRON_CLEANUP] Remaining session ${index + 1}:`, {
          session_id: session.session_id.substring(0, 8) + "...",
          status: session.status,
          expires_at: session.expires_at,
        });
      });
    }

    return deletedCount;
  } catch (error) {
    console.error("[CRON_CLEANUP] Exception in cleanupExpiredSessions:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
    });
    throw error;
  }
}

/**
 * GET /api/cron/cleanup-sessions
 * Статус API и диагностическая информация
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const timestamp = new Date().toISOString();
  
  console.log("[CRON_CLEANUP] GET request received at", timestamp);

  const authHeader = request.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");

  // Базовая информация без авторизации для health check
  const baseInfo = {
    status: "Session cleanup API is active",
    endpoint: `${request.nextUrl.origin}/api/cron/cleanup-sessions`,
    timestamp,
    server_time: timestamp,
  };

  if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
    console.log("[CRON_CLEANUP] GET request without valid auth, returning basic info");
    
    return NextResponse.json({
      ...baseInfo,
      authenticated: false,
      message: "Add Authorization header for detailed stats",
    });
  }

  console.log("[CRON_CLEANUP] Authenticated GET request, providing full stats");

  try {
    // Получаем детальную статистику сессий
    const [activeResult, expiredTodayResult, finishedTodayResult] = await Promise.all([
      supabaseServer
        .from("game_sessions")
        .select("session_id", { count: "exact" })
        .eq("status", "active"),

      supabaseServer
        .from("game_sessions")
        .select("session_id", { count: "exact" })
        .eq("status", "expired")
        .gte("updated_at", new Date().toISOString().split("T")[0]),

      supabaseServer
        .from("game_sessions")
        .select("session_id", { count: "exact" })
        .eq("status", "finished")
        .gte("updated_at", new Date().toISOString().split("T")[0]),
    ]);

    // Проверяем наличие сессий для очистки
    const graceTime = new Date();
    graceTime.setMinutes(graceTime.getMinutes() - CRON_CONFIG.GRACE_PERIOD_MINUTES);

    const { count: expiredCount } = await supabaseServer
      .from("game_sessions")
      .select("session_id", { count: "exact" })
      .eq("status", "active")
      .lt("expires_at", graceTime.toISOString());

    // Получаем самую старую активную сессию
    const { data: oldestSession } = await supabaseServer
      .from("game_sessions")
      .select("created_at, expires_at")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    console.log("[CRON_CLEANUP] Stats gathered successfully");

    return NextResponse.json({
      ...baseInfo,
      authenticated: true,
      config: {
        max_sessions_per_run: CRON_CONFIG.MAX_SESSIONS_PER_RUN,
        grace_period_minutes: CRON_CONFIG.GRACE_PERIOD_MINUTES,
        api_key_configured: !!CRON_CONFIG.CRON_API_KEY,
      },
      current_stats: {
        active_sessions: activeResult.count || 0,
        expired_today: expiredTodayResult.count || 0,
        finished_today: finishedTodayResult.count || 0,
        sessions_ready_for_cleanup: expiredCount || 0,
        oldest_active_session: oldestSession?.created_at || null,
        oldest_expires_at: oldestSession?.expires_at || null,
      },
      database_status: {
        connected: true,
        last_check: timestamp,
      },
      environment: {
        node_env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL_ENV,
      },
    });
  } catch (error) {
    console.error("[CRON_CLEANUP] Error getting stats:", error);
    
    return NextResponse.json(
      {
        ...baseInfo,
        authenticated: true,
        error: "Failed to get detailed stats",
        error_message: error instanceof Error ? error.message : "Unknown error",
        database_status: {
          connected: false,
          error: error instanceof Error ? error.message : "Connection failed",
        },
      },
      { status: 500 },
    );
  }
}