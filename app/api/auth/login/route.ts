// src/app/api/auth/login/route.ts - Updated authentication endpoint with secure response

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer, type TelegramUserData } from "@/lib/supabase-server";
import { generateToken, validateTelegramInitData } from "@/lib/jwt";

const ATTEMPTS_CONFIG = {
  BASE_ATTEMPTS: 10,
  RESET_ATTEMPTS: 10,
  RESET_INTERVAL_MS: 2 * 60 * 60 * 1000,
  REFERRAL_BONUS: 5,
} as const;

// Internal function to call security check API
async function checkUserSecurityStatus(
  telegramId: number,
  baseUrl: string,
): Promise<{
  isBlocked: boolean;
  timeUntilUnblock?: number;
  blockReason?: string;
}> {
  try {
    // Create temporary token for security check (this is an internal API call)
    const tempToken = await generateToken(`temp-${telegramId}`, telegramId);

    const response = await fetch(`${baseUrl}/api/security/check-status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tempToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Security check API failed:", response.status);

      return { isBlocked: false }; // Default to not blocked on API failure
    }

    const data = await response.json();

    if (!data.success) {
      console.error("Security check failed:", data.error);

      return { isBlocked: false };
    }

    return {
      isBlocked: data.securityResult.isBlocked,
      timeUntilUnblock: data.securityResult.timeUntilUnblock,
      blockReason: data.securityResult.blockReason,
    };
  } catch (error) {
    console.error("Error calling security check API:", error);

    return { isBlocked: false }; // Default to not blocked on error
  }
}

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

    // Get base URL for internal API calls
    const baseUrl = request.nextUrl.origin;

    // UPDATED: Use API endpoint for security check instead of direct RPC
    const securityStatus = await checkUserSecurityStatus(
      telegramUser.id,
      baseUrl,
    );

    if (securityStatus.isBlocked) {
      return NextResponse.json(
        {
          success: false,
          error: "User is temporarily blocked",
          isBlocked: true,
          timeUntilUnblock: securityStatus.timeUntilUnblock,
          blockReason: securityStatus.blockReason,
        },
        { status: 403 },
      );
    }

    // Check if user exists
    let { data: user, error: findError } = await supabaseServer
      .from("users")
      .select("*")
      .eq("telegram_id", telegramUser.id)
      .single();

    // If user exists, perform security check and return authentication
    if (user && !findError) {
      // Perform additional security check for existing users
      const existingUserSecurityCheck = await checkUserSecurityStatus(
        telegramUser.id,
        baseUrl,
      );

      if (existingUserSecurityCheck.isBlocked) {
        return NextResponse.json(
          {
            success: false,
            error: "User is temporarily blocked",
            isBlocked: true,
            timeUntilUnblock: existingUserSecurityCheck.timeUntilUnblock,
            blockReason: existingUserSecurityCheck.blockReason,
          },
          { status: 403 },
        );
      }

      // Generate JWT token for existing user
      const token = await generateToken(user.id, telegramUser.id);

      // SECURITY FIX: Return safe user data without trust_score and with obfuscated ID
      const safeUser = {
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        current_level: user.current_level,
        attempts_remaining: user.attempts_remaining,
        total_games: user.total_games,
        // trust_score: REMOVED for security
        blocked_until: user.blocked_until,
        total_score: user.total_score,
        best_score: user.best_score,
        current_league_id: user.current_league_id,
      };

      return NextResponse.json({
        success: true,
        token,
        user: safeUser,
        isExistingUser: true,
      });
    }

    // UPDATED: For new users, return registration required instead of auto-creating
    if (findError?.code === "PGRST116" || !user) {
      // Return that registration is needed, don't auto-create user
      return NextResponse.json(
        {
          success: false,
          needsRegistration: true,
          telegramUser: {
            id: telegramUser.id,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name,
            username: telegramUser.username,
            language_code: telegramUser.language_code,
            is_premium: telegramUser.is_premium,
          },
          referralCode: referralCode || null,
        },
        { status: 202 },
      ); // 202 Accepted - indicates further action needed
    }

    if (!user) {
      throw new Error("Failed to retrieve user");
    }

    // This should not be reached, but included for completeness
    const token = await generateToken(user.id, telegramUser.id);

    // SECURITY FIX: Return safe user data without trust_score
    const safeUser = {
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      current_level: user.current_level,
      attempts_remaining: user.attempts_remaining,
      total_games: user.total_games,
      // trust_score: REMOVED for security
      blocked_until: user.blocked_until,
    };

    return NextResponse.json({
      success: true,
      token,
      user: safeUser,
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