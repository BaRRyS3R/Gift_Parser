// src/app/api/security/check-status/route.ts - Check user security status

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { supabaseServer } from "@/lib/supabaseServer";

export const GET = withAuth(async (request) => {
  try {
    const { user } = request;
    // Получаем пользователя
    const { data: userData, error: userError } = await supabaseServer
      .from("users")
      .select("blocked_until, trust_score")
      .eq("telegram_id", user.telegramId)
      .maybeSingle();
    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }
    const now = new Date();
    const blockedUntil = userData.blocked_until
      ? new Date(userData.blocked_until)
      : null;
    const isBlocked = blockedUntil ? blockedUntil > now : false;
    let timeUntilUnblock = null;
    if (isBlocked && blockedUntil) {
      timeUntilUnblock = blockedUntil.getTime() - now.getTime();
    }
    // Получаем причину блокировки, если есть
    let blockReason = undefined;
    if (isBlocked) {
      const { data: blockData } = await supabaseServer
        .from("user_blocks")
        .select("block_reason")
        .eq("telegram_id", user.telegramId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (blockData) {
        blockReason = blockData.block_reason;
      }
    }
    const trustScore = userData.trust_score || 50;
    return NextResponse.json({
      success: true,
      isBlocked,
      trustScore,
      needsCaptcha: !isBlocked && trustScore < 40,
      needsBiometric: !isBlocked && trustScore < 20,
      timeUntilUnblock:
        timeUntilUnblock && timeUntilUnblock > 0 ? timeUntilUnblock : undefined,
      blockReason,
    });
  } catch (error) {
    console.error("Error checking security status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check security status" },
      { status: 500 },
    );
  }
});
