// src/app/api/security/check-status/route.ts - ИСПРАВЛЕНО: прямые запросы вместо RPC

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    // Get user ID from middleware-added header
    const userId = request.headers.get("x-user-id");
    const telegramId = request.headers.get("x-telegram-id");

    if (!userId || !telegramId) {
      return NextResponse.json(
        {
          success: false,
          error: "User authentication required",
        },
        { status: 401 },
      );
    }

    // Get current server time
    const serverTime = new Date();

    // ИСПРАВЛЕНО: сначала проверяем и разблокируем пользователя если время прошло
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("trust_score, blocked_until, is_active")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error("Database error fetching user:", userError);
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
          message: userError?.message,
        },
        { status: 404 },
      );
    }

    // Автоматическое разблокирование если время прошло
    if (user.blocked_until && new Date(user.blocked_until) <= serverTime) {
      console.log(`Auto-unblocking user ${telegramId} - block time expired`);

      // Разблокируем пользователя
      const { error: unblockError } = await supabaseServer
        .from("users")
        .update({
          blocked_until: null,
          is_active: true,
          updated_at: serverTime.toISOString(),
        })
        .eq("id", userId);

      if (unblockError) {
        console.error("Error auto-unblocking user:", unblockError);
      }

      // Деактивируем активные блоки
      const { error: deactivateError } = await supabaseServer
        .from("user_blocks")
        .update({
          is_active: false,
          unblocked_at: serverTime.toISOString(),
          updated_at: serverTime.toISOString(),
        })
        .eq("telegram_id", parseInt(telegramId))
        .eq("is_active", true);

      if (deactivateError) {
        console.error("Error deactivating blocks:", deactivateError);
      }

      // Обновляем локальные данные пользователя
      user.blocked_until = null;
      user.is_active = true;
    }

    // Проверяем статус блокировки
    const isBlocked = user.blocked_until
      ? new Date(user.blocked_until) > serverTime
      : false;

    let timeUntilUnblock: number | undefined;
    let blockReason: string | undefined;

    if (isBlocked && user.blocked_until) {
      timeUntilUnblock =
        new Date(user.blocked_until).getTime() - serverTime.getTime();

      // Получаем причину блокировки
      const { data: blockData } = await supabaseServer
        .from("user_blocks")
        .select("block_reason")
        .eq("telegram_id", parseInt(telegramId))
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (blockData) {
        blockReason = blockData.block_reason;
      }
    }

    const trustScore = user.trust_score || 50;

    // NEW: Updated security thresholds
    const needsCaptcha = !isBlocked && trustScore < 50;
    const needsBiometric = !isBlocked && trustScore < 20;
    const needsGyroscope = !isBlocked && trustScore < 10;

    console.log(`Security check for user ${telegramId}: trust_score=${trustScore}, blocked=${isBlocked}, needs_captcha=${needsCaptcha}, needs_biometric=${needsBiometric}, needs_gyroscope=${needsGyroscope}`);

    return NextResponse.json({
      success: true,
      securityResult: {
        isBlocked,
        needsCaptcha,
        needsBiometric,
        needsGyroscope,
        trustScore,
        timeUntilUnblock:
          timeUntilUnblock && timeUntilUnblock > 0
            ? timeUntilUnblock
            : undefined,
        blockReason,
      },
    });
  } catch (error) {
    console.error("Security check status API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}