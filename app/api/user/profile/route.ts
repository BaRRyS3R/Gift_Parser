// src/app/api/user/profile/route.ts - User profile API endpoint

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

    // Fetch user data from database using service key
    const { data: user, error } = await supabaseServer
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Database error fetching user:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch user data",
          message: error.message,
        },
        { status: 500 },
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // Return safe user data (without sensitive fields)
    const safeUser = {
      id: user.id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      current_level: user.current_level,
      attempts_remaining: user.attempts_remaining,
      total_games: user.total_games,
      trust_score: user.trust_score,
      blocked_until: user.blocked_until,
      total_score: user.total_score,
      best_score: user.best_score,
      current_league_id: user.current_league_id,
      // Game-specific stats
      reaction_games: user.reaction_games,
      reaction_best_score: user.reaction_best_score,
      reaction_best_time: user.reaction_best_time,
      reaction_average_time: user.reaction_average_time,
      survival_games: user.survival_games,
      survival_best_score: user.survival_best_score,
      survival_best_time: user.survival_best_time,
      survival_max_level: user.survival_max_level,
      survival_best_streak: user.survival_best_streak,
      physics_games: user.physics_games,
      physics_best_score: user.physics_best_score,
      physics_best_time: user.physics_best_time,
      physics_total_hits: user.physics_total_hits,
      physics_best_hits: user.physics_best_hits,
      physics_least_mistakes: user.physics_least_mistakes,
      rotation_games: user.rotation_games,
      rotation_best_score: user.rotation_best_score,
      rotation_best_time: user.rotation_best_time,
      rotation_max_level: user.rotation_max_level,
      rotation_best_streak: user.rotation_best_streak,
      rotation_total_hits: user.rotation_total_hits,
      // Legacy fields
      total_correct_hits: user.total_correct_hits,
      total_wrong_hits: user.total_wrong_hits,
      total_missed_circles: user.total_missed_circles,
      best_accuracy: user.best_accuracy,
      last_played_at: user.last_played_at,
      is_active: user.is_active,
      // Referral info
      referral_code: user.referral_code,
      referral_count: user.referral_count,
      referral_bonus: user.referral_bonus,
    };

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    console.error("User profile API error:", error);

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
