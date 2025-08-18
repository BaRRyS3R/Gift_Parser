// src/app/api/easter-egg/reward/route.ts

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase_server";

// Valid Easter Egg types
type EasterEggType = "binary" | "cat" | "winx";

// Easter Egg reward mapping
const EASTER_EGG_REWARDS: Record<
  EasterEggType,
  {
    achievementId: string;
    attempts: number;
    name: string;
  }
> = {
  binary: {
    achievementId: "binary_easter_egg",
    attempts: 100,
    name: "BINARY GENIUS",
  },
  cat: {
    achievementId: "cat_easter_egg",
    attempts: 5,
    name: "CAT WHISPERER",
  },
  winx: {
    achievementId: "winx_easter_egg",
    attempts: 20,
    name: "FAIRY GODPARENT",
  },
};

// Response interface
interface EasterEggRewardResponse {
  success: boolean;
  alreadyUnlocked?: boolean;
  achievement?: {
    id: string;
    name: string;
    attemptsAwarded: number;
  };
  error?: string;
}

/**
 * POST /api/easter-egg/reward
 * Award Easter Egg achievement and attempts to user
 * Body: { easterEggType: 'binary' | 'cat' | 'winx' }
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<EasterEggRewardResponse>> {
  try {
    // Extract user info from middleware headers
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User authentication required",
        },
        { status: 401 },
      );
    }

    const telegramIdNumber = parseInt(telegramId);

    if (isNaN(telegramIdNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID",
        },
        { status: 400 },
      );
    }

    // Parse request body
    const { easterEggType } = await request.json();

    if (!easterEggType || !EASTER_EGG_REWARDS[easterEggType as EasterEggType]) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Easter Egg type",
        },
        { status: 400 },
      );
    }

    const reward = EASTER_EGG_REWARDS[easterEggType as EasterEggType];

    // Check if user already has this achievement
    const { data: existingAchievement, error: checkError } =
      await supabaseServer
        .from("user_achievements")
        .select("id")
        .eq("user_id", userId)
        .eq("achievement_id", reward.achievementId)
        .maybeSingle();

    if (checkError) {
      console.error("Error checking existing achievement:", checkError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to check achievement status",
        },
        { status: 500 },
      );
    }

    // If already unlocked, return early
    if (existingAchievement) {
      return NextResponse.json({
        success: true,
        alreadyUnlocked: true,
      });
    }

    // Award the achievement using a transaction
    const { data: result, error: transactionError } = await supabaseServer.rpc(
      "award_easter_egg_achievement",
      {
        p_user_id: userId,
        p_achievement_id: reward.achievementId,
        p_attempts_reward: reward.attempts,
      },
    );

    if (transactionError) {
      console.error("Error awarding Easter Egg achievement:", transactionError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to award achievement",
        },
        { status: 500 },
      );
    }

    // Log the Easter Egg discovery
    console.log(
      `🎉 Easter Egg "${easterEggType}" found by user ${telegramIdNumber}! Awarded ${reward.attempts} attempts.`,
    );

    return NextResponse.json({
      success: true,
      alreadyUnlocked: false,
      achievement: {
        id: reward.achievementId,
        name: reward.name,
        attemptsAwarded: reward.attempts,
      },
    });
  } catch (error) {
    console.error("Error in Easter Egg reward endpoint:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
