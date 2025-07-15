// src/app/api/profile/achievements/route.ts - Protected achievements endpoint
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { supabaseServer } from "@/lib/supabaseServer";

export const GET = withAuth(async (request) => {
  try {
    const { user } = request;
    // Получаем пользователя
    const { data: userData, error: userError } = await supabaseServer
      .from("users")
      .select("id")
      .eq("telegram_id", user.telegramId)
      .maybeSingle();
    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }
    // Получаем достижения пользователя (пример: таблица user_achievements)
    const { data: achievements, error: achError } = await supabaseServer
      .from("user_achievements")
      .select("*")
      .eq("user_id", userData.id);
    if (achError) {
      return NextResponse.json(
        { success: false, error: achError.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, achievements });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch achievements" },
      { status: 500 },
    );
  }
});
