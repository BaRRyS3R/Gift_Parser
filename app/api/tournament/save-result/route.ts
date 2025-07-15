// src/app/api/tournament/save-result/route.ts - Protected tournament result saving

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { supabaseServer } from "@/lib/supabaseServer";

export const POST = withAuth(async (request) => {
  try {
    const { user } = request;
    const body = await request.json();
    const {
      tournamentId,
      survivalTime,
      score,
      maxLevelReached,
      perfectStreak,
      correctHits,
      deathCause,
    } = body;

    // Получаем пользователя
    const { data: userData, error: userError } = await supabaseServer
      .from("users")
      .select("id, telegram_id")
      .eq("telegram_id", user.telegramId)
      .maybeSingle();
    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Сохраняем результат турнира (пример для таблицы tournament_leaderboard)
    const { error: insertError } = await supabaseServer
      .from("tournament_leaderboard")
      .insert({
        tournament_id: tournamentId,
        user_id: userData.id,
        telegram_id: user.telegramId,
        survival_time: survivalTime,
        survival_score: score,
        max_level_reached: maxLevelReached,
        perfect_streak: perfectStreak,
        correct_hits: correctHits,
        death_cause: deathCause,
        created_at: new Date().toISOString(),
      });
    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving tournament result:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save tournament result" },
      { status: 500 },
    );
  }
});
