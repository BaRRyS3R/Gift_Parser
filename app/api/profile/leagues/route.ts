// src/app/api/profile/leagues/route.ts - Protected leagues endpoint
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
    // Получаем лиги пользователя (user_leagues)
    const { data: leagues, error: leaguesError } = await supabaseServer
      .from("user_leagues")
      .select("*")
      .eq("user_id", userData.id);
    if (leaguesError) {
      return NextResponse.json(
        { success: false, error: leaguesError.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, leagues });
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leagues" },
      { status: 500 },
    );
  }
});
