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
 * Очистка истекших сессий с МАКСИМАЛЬНОЙ диагностикой
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
      currentTimeStamp: currentTime.getTime(),
      graceTimeStamp: graceTime.getTime(),
    });

    // 🔍 ДИАГНОСТИКА: Проверяем ВСЕ сессии в базе
    console.log("[CRON_CLEANUP] === ПОЛНАЯ ДИАГНОСТИКА ВСЕХ СЕССИЙ ===");
    
    const { data: allSessions, error: allSessionsError } = await supabaseServer
      .from("game_sessions")
      .select("session_id, status, expires_at, created_at, updated_at")
      .order("expires_at", { ascending: true });

    if (allSessionsError) {
      console.error("[CRON_CLEANUP] Error getting all sessions:", allSessionsError);
    } else {
      console.log("[CRON_CLEANUP] All sessions in database:", allSessions?.length || 0);
      
      allSessions?.forEach((session, index) => {
        const expiresAt = new Date(session.expires_at);
        const isExpired = expiresAt < graceTime;
        const isActive = session.status === "active";
        
        console.log(`[CRON_CLEANUP] Session ${index + 1}:`, {
          session_id: session.session_id.substring(0, 8) + "...",
          status: session.status,
          expires_at: session.expires_at,
          expires_timestamp: expiresAt.getTime(),
          is_expired: isExpired,
          is_active: isActive,
          should_clean: isActive && isExpired,
          time_diff_minutes: Math.round((graceTime.getTime() - expiresAt.getTime()) / (1000 * 60)),
        });
      });
    }

    // 🔍 ДИАГНОСТИКА: Проверяем активные сессии
    console.log("[CRON_CLEANUP] === ДИАГНОСТИКА АКТИВНЫХ СЕССИЙ ===");
    
    const { data: activeSessions, error: activeError } = await supabaseServer
      .from("game_sessions")
      .select("session_id, expires_at, created_at")
      .eq("status", "active");

    if (activeError) {
      console.error("[CRON_CLEANUP] Error getting active sessions:", activeError);
    } else {
      console.log("[CRON_CLEANUP] Active sessions found:", activeSessions?.length || 0);
      
      activeSessions?.forEach((session, index) => {
        const expiresAt = new Date(session.expires_at);
        const isExpired = expiresAt < graceTime;
        
        console.log(`[CRON_CLEANUP] Active session ${index + 1}:`, {
          session_id: session.session_id.substring(0, 8) + "...",
          expires_at: session.expires_at,
          is_expired_with_grace: isExpired,
          minutes_past_grace: Math.round((graceTime.getTime() - expiresAt.getTime()) / (1000 * 60)),
        });
      });
    }

    // 🔍 ДИАГНОСТИКА: Проверяем истекшие активные сессии
    console.log("[CRON_CLEANUP] === ДИАГНОСТИКА ИСТЕКШИХ АКТИВНЫХ СЕССИЙ ===");
    
    const { data: expiredActiveSessions, error: expiredActiveError } = await supabaseServer
      .from("game_sessions")
      .select("session_id, expires_at, created_at")
      .eq("status", "active")
      .lt("expires_at", graceTime.toISOString());

    if (expiredActiveError) {
      console.error("[CRON_CLEANUP] Error getting expired active sessions:", expiredActiveError);
    } else {
      console.log("[CRON_CLEANUP] Expired active sessions found:", expiredActiveSessions?.length || 0);
      
      expiredActiveSessions?.forEach((session, index) => {
        console.log(`[CRON_CLEANUP] Will clean session ${index + 1}:`, {
          session_id: session.session_id.substring(0, 8) + "...",
          expires_at: session.expires_at,
          created_at: session.created_at,
        });
      });
    }

    // Подсчитываем количество сессий для очистки
    const { count: sessionsToClean, error: countError } = await supabaseServer
      .from("game_sessions")
      .select("session_id", { count: "exact" })
      .eq("status", "active")
      .lt("expires_at", graceTime.toISOString());

    if (countError) {
      console.error("[CRON_CLEANUP] Error counting sessions:", countError);
      throw new Error(`Failed to count sessions: ${countError.message}`);
    }

    console.log("[CRON_CLEANUP] Sessions count for cleanup:", sessionsToClean || 0);

    if ((sessionsToClean || 0) === 0) {
      console.log("[CRON_CLEANUP] === NO SESSIONS TO CLEAN - ANALYSIS COMPLETE ===");
      return 0;
    }

    // Выполняем обновление статуса истекших сессий
    console.log("[CRON_CLEANUP] Starting update operation...");
    
    const updateResult = await supabaseServer
      .from("game_sessions")
      .update({
        status: "expired",
        updated_at: currentTime.toISOString(),
      })
      .eq("status", "active")
      .lt("expires_at", graceTime.toISOString());

    console.log("[CRON_CLEANUP] Update operation completed:", {
      count: updateResult.count,
      error: updateResult.error,
      status: updateResult.status,
      statusText: updateResult.statusText,
    });

    if (updateResult.error) {
      console.error("[CRON_CLEANUP] Database update error:", {
        message: updateResult.error.message,
        details: updateResult.error.details,
        hint: updateResult.error.hint,
        code: updateResult.error.code,
      });
      throw new Error(`Failed to update expired sessions: ${updateResult.error.message}`);
    }

    const cleanedCount = updateResult.count || 0;
    console.log("[CRON_CLEANUP] Successfully cleaned sessions:", cleanedCount);

    return cleanedCount;
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