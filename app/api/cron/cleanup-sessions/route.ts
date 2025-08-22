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

  console.log("[CRON_CLEANUP] Starting cleanup request");

  try {
    // Проверяем наличие API ключа в переменных окружения
    if (!CRON_CONFIG.CRON_API_KEY) {
      console.error("[CRON_CLEANUP] CRON_API_KEY not configured");
      
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

    if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
      console.warn("[CRON_CLEANUP] Unauthorized access attempt");

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

    console.log("[CRON_CLEANUP] Authorization successful");

    // Выполняем очистку истекших сессий
    const cleanedCount = await cleanupExpiredSessions();

    const executionTime = Date.now() - startTime;

    console.log(
      `[CRON_CLEANUP] Completed: ${cleanedCount} sessions cleaned in ${executionTime}ms`,
    );

    return NextResponse.json({
      success: true,
      sessions_cleaned: cleanedCount,
      execution_time_ms: executionTime,
      timestamp,
    });
  } catch (error) {
    console.error("[CRON_CLEANUP] Error:", error instanceof Error ? error.message : "Unknown error");

    const executionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

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
 * Физическое удаление всех истёкших сессий через SQL функцию
 */
async function cleanupExpiredSessions(): Promise<number> {
  try {
    // Используем SQL функцию для очистки
    const { data, error } = await supabaseServer.rpc(
      "cleanup_expired_game_sessions",
      {
        grace_period_minutes: CRON_CONFIG.GRACE_PERIOD_MINUTES,
        max_sessions_to_delete: CRON_CONFIG.MAX_SESSIONS_PER_RUN,
      }
    );

    if (error) {
      console.error("[CRON_CLEANUP] SQL function error:", error);
      throw new Error(`Cleanup function failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log("[CRON_CLEANUP] No data returned from cleanup function");
      return 0;
    }

    const result = data[0];
    const deletedCount = result.sessions_deleted || 0;
    
    console.log("[CRON_CLEANUP] Successfully deleted sessions:", deletedCount);
    console.log("[CRON_CLEANUP] Grace time used:", result.grace_time_used);

    return deletedCount;
  } catch (error) {
    console.error("[CRON_CLEANUP] Error:", error instanceof Error ? error.message : "Unknown error");
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