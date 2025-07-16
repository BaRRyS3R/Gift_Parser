// src/app/api/auth/register/route.ts - Secure registration endpoint without trust_score exposure

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer, type TelegramUserData } from "@/lib/supabase-server";
import { generateToken, validateTelegramInitData } from "@/lib/jwt";

const ATTEMPTS_CONFIG = {
  BASE_ATTEMPTS: 10,
  RESET_ATTEMPTS: 10,
  RESET_INTERVAL_MS: 2 * 60 * 60 * 1000,
  REFERRAL_BONUS: 5,
} as const;

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

    const telegramUser: TelegramUserData = {
      id: userData.id,
      first_name: userData.first_name,
      last_name: userData.last_name,
      username: userData.username,
      language_code: userData.language_code,
      is_premium: userData.is_premium || false,
    };

    // Check if user already exists
    const { data: existingUser } = await supabaseServer
      .from("users")
      .select("id")
      .eq("telegram_id", telegramUser.id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User already exists. Please use login instead.",
        },
        { status: 409 },
      );
    }

    // Handle referral logic
    let additionalAttempts = ATTEMPTS_CONFIG.BASE_ATTEMPTS;
    let referredBy = null;

    if (referralCode) {
      const { data: referrer } = await supabaseServer
        .from("users")
        .select("id, referral_bonus, referral_count, attempts_remaining")
        .eq("referral_code", referralCode)
        .single();

      if (referrer) {
        referredBy = referralCode;
        additionalAttempts += referrer.referral_bonus;

        // Update referrer's stats
        await supabaseServer
          .from("users")
          .update({
            referral_count: referrer.referral_count + 1,
            attempts_remaining: referrer.attempts_remaining + 5,
            updated_at: new Date().toISOString(),
          })
          .eq("id", referrer.id);
      }
    }

    // Generate unique referral code
    let referralCodeToUse = "";
    let isUnique = false;

    while (!isUnique) {
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

      referralCodeToUse = "";
      for (let i = 0; i < 8; i++) {
        referralCodeToUse += characters.charAt(
          Math.floor(Math.random() * characters.length),
        );
      }

      const { data: existingUserWithCode } = await supabaseServer
        .from("users")
        .select("id")
        .eq("referral_code", referralCodeToUse)
        .single();

      if (!existingUserWithCode) {
        isUnique = true;
      }
    }

    const newUserData = {
      telegram_id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name || null,
      username: telegramUser.username || null,
      language_code: telegramUser.language_code || null,
      is_premium: telegramUser.is_premium || false,
      attempts_remaining: additionalAttempts,
      referral_code: referralCodeToUse,
      referred_by: referredBy,
      referral_bonus: 5,
      referral_count: 0,
      current_level: 1,
      trust_score: telegramUser.is_premium ? 60 : 50, // Initial trust score with premium bonus
    };

    const { data: newUser, error: createError } = await supabaseServer
      .from("users")
      .insert(newUserData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    // Initialize user league
    try {
      await supabaseServer.rpc("initialize_user_league", {
        user_id: newUser.id,
        initial_games: 0,
      });
    } catch (leagueError) {
      console.error("Error initializing user league:", leagueError);
      // Continue anyway, league can be initialized later
    }

    // Generate JWT token with secure session ID
    const token = await generateToken(newUser.id, telegramUser.id);

    // SECURITY FIX: Return safe user data without trust_score and without UUID exposure
    const safeUser = {
      telegram_id: newUser.telegram_id,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      username: newUser.username,
      current_level: newUser.current_level,
      attempts_remaining: newUser.attempts_remaining,
      total_games: newUser.total_games,
      // trust_score: REMOVED for security - not exposed to client
      blocked_until: newUser.blocked_until,
      total_score: newUser.total_score,
      best_score: newUser.best_score,
      current_league_id: newUser.current_league_id,
    };

    return NextResponse.json({
      success: true,
      token,
      user: safeUser,
      referralApplied: !!referredBy,
      referralBonus: referredBy ? ATTEMPTS_CONFIG.REFERRAL_BONUS : 0,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Registration failed",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}