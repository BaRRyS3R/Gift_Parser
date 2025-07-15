// src/app/api/game/consume-attempt/route.ts - Protected attempt consumption

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { supabaseServer } from "@/lib/supabaseServer";

export const POST = withAuth(async (request) => {
  try {
    const { user } = request;
    // Получаем пользователя
    const { data: userData, error: userError } = await supabaseServer
      .from("users")
      .select("*")
      .eq("telegram_id", user.telegramId)
      .maybeSingle();
    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }
    if (userData.attempts_remaining <= 0) {
      return NextResponse.json(
        { success: false, error: "No attempts remaining" },
        { status: 400 },
      );
    }
    // Списываем попытку
    const newAttempts = userData.attempts_remaining - 1;
    const updates = {
      attempts_remaining: newAttempts,
      last_attempt_at: new Date().toISOString(),
    };
    const { error: updateError } = await supabaseServer
      .from("users")
      .update(updates)
      .eq("telegram_id", user.telegramId);
    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, attemptsRemaining: newAttempts });
  } catch (error) {
    console.error("Error consuming attempt:", error);
    return NextResponse.json(
      { success: false, error: "Failed to consume attempt" },
      { status: 500 },
    );
  }
});
