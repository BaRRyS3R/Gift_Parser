// src/app/api/cron/cleanup-sessions/route.ts - API для внешнего CRON сервиса

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

  try {
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

    console.log("[CRON_CLEANUP] Starting expired sessions cleanup");

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
    console.error("[CRON_CLEANUP] Error:", error);

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
 * Очистка истекших сессий - простая реализация без RPC
 */
async function cleanupExpiredSessions(): Promise<number> {
  try {
    // Рассчитываем время с учетом grace period
    const graceTime = new Date();
    graceTime.setMinutes(
      graceTime.getMinutes() - CRON_CONFIG.GRACE_PERIOD_MINUTES,
    );

    // Обновляем статус истекших сессий
    const { count, error } = await supabaseServer
      .from("game_sessions")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("status", "active")
      .lt("expires_at", graceTime.toISOString());

    if (error) {
      console.error("[CRON_CLEANUP] Database error:", error);
      throw new Error("Failed to update expired sessions");
    }

    return count || 0;
  } catch (error) {
    console.error("[CRON_CLEANUP] Error in cleanupExpiredSessions:", error);
    throw error;
  }
}

/**
 * GET /api/cron/cleanup-sessions
 * Статус API для отладки
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");

  if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Получаем статистику сессий
    const { count: activeSessions } = await supabaseServer
      .from("game_sessions")
      .select("session_id", { count: "exact" })
      .eq("status", "active");

    const { count: expiredToday } = await supabaseServer
      .from("game_sessions")
      .select("session_id", { count: "exact" })
      .eq("status", "expired")
      .gte("updated_at", new Date().toISOString().split("T")[0]);

    return NextResponse.json({
      status: "Session cleanup API is active",
      config: {
        max_sessions_per_run: CRON_CONFIG.MAX_SESSIONS_PER_RUN,
        grace_period_minutes: CRON_CONFIG.GRACE_PERIOD_MINUTES,
      },
      current_stats: {
        active_sessions: activeSessions || 0,
        expired_today: expiredToday || 0,
      },
      endpoint: `${request.nextUrl.origin}/api/cron/cleanup-sessions`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "Session cleanup API is active",
        error: "Failed to get stats",
        endpoint: `${request.nextUrl.origin}/api/cron/cleanup-sessions`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}