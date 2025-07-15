// src/app/api/auth/login/route.ts - Authentication endpoint

import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/lib/supabase";
import { generateToken, validateTelegramInitData } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const { initData, referralCode } = await request.json();

    // Validate Telegram WebApp init data
    if (!validateTelegramInitData(initData)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Telegram authentication data",
        },
        { status: 400 },
      );
    }

    // Parse Telegram user data
    const params = new URLSearchParams(initData);
    const userData = JSON.parse(params.get("user") || "{}");

    const telegramUser = {
      id: userData.id,
      first_name: userData.first_name,
      last_name: userData.last_name,
      username: userData.username,
      language_code: userData.language_code,
      is_premium: userData.is_premium || false,
    };

    // Check if user exists
    let user = await userService.findByTelegramId(telegramUser.id);

    // Create user if doesn't exist
    if (!user) {
      user = await userService.create(telegramUser, referralCode);
    }

    // Generate JWT token
    const token = await generateToken(user.id, telegramUser.id);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        current_level: user.current_level,
        attempts_remaining: user.attempts_remaining,
        total_games: user.total_games,
      },
    });
  } catch (error) {
    console.error("Authentication error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Authentication failed",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
