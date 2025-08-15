// src/app/api/auth/register/route.ts - Updated to use server league service

import type { TelegramUser } from "@/lib/supabase";

import { NextRequest, NextResponse } from "next/server";

import { serverUserService } from "@/lib/supabase_server";
import {
  validateTelegramData,
  extractReferralCode,
  createInitDataHash,
} from "@/lib/telegram-auth";
import { createJWT, createRefreshToken } from "@/lib/jwt";

// Request body interface
interface RegisterRequest {
  initData: string;
  referralCode?: string;
}

// Response interface
interface RegisterResponse {
  success: boolean;
  user?: {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium: boolean;
    trust_score: number;
    blocked_until?: string;
    current_level: number;
    total_games: number;
    attempts_remaining: number;
    referral_code: string;
    created_at: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  referralBonus?: {
    received: number;
    referrerName?: string;
    referrerUsername?: string;
  };
  error?: string;
}

/**
 * POST /api/auth/register
 * Registers a new user with Telegram WebApp data validation
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<RegisterResponse>> {
  try {
    // Parse request body
    const body: RegisterRequest = await request.json();
    const { initData, referralCode } = body;

    if (!initData) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing initData parameter",
        },
        { status: 400 },
      );
    }

    // Validate Telegram WebApp data
    const validation = validateTelegramData(initData);

    if (!validation.isValid || !validation.user) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || "Invalid Telegram data",
        },
        { status: 400 },
      );
    }

    const telegramUser: TelegramUser = validation.user;

    // Check if user already exists
    const existingUser = await serverUserService.findByTelegramId(
      telegramUser.id,
    );

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User already exists",
        },
        { status: 409 },
      );
    }

    // Extract referral code from initData if not provided
    const extractedReferralCode = extractReferralCode(initData);
    const finalReferralCode =
      referralCode || extractedReferralCode || undefined;

    // Validate referral code and get referrer info
    let referralBonusInfo:
      | {
          received: number;
          referrerName?: string;
          referrerUsername?: string;
        }
      | undefined;

    if (finalReferralCode) {
      const referralValidation =
        await serverUserService.validateReferralCodeAndGetReferrer(
          finalReferralCode,
        );

      if (referralValidation.isValid) {
        referralBonusInfo = {
          received: referralValidation.bonus,
          referrerName: referralValidation.referrerName,
          referrerUsername: referralValidation.referrerUsername,
        };
      }
    }

    // Create new user
    const newUser = await serverUserService.create(
      telegramUser,
      finalReferralCode,
    );

    // Create JWT tokens
    const initDataHash = createInitDataHash(initData);

    const accessToken = await createJWT({
      userId: newUser.id,
      telegramId: newUser.telegram_id,
      telegramData: {
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        username: newUser.username,
        language_code: newUser.language_code,
        is_premium: newUser.is_premium,
      },
      initDataHash,
    });

    const refreshToken = await createRefreshToken({
      userId: newUser.id,
      telegramId: newUser.telegram_id,
      telegramData: {
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        username: newUser.username,
        language_code: newUser.language_code,
        is_premium: newUser.is_premium,
      },
    });

    // Prepare user data for response (excluding sensitive fields)
    const userData = {
      id: newUser.id,
      telegram_id: newUser.telegram_id,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      username: newUser.username,
      language_code: newUser.language_code,
      is_premium: newUser.is_premium,

      // Trust and moderation fields
      trust_score: newUser.trust_score,
      blocked_until: newUser.blocked_until,

      current_level: newUser.current_level,
      total_games: newUser.total_games,
      attempts_remaining: newUser.attempts_remaining,
      referral_code: newUser.referral_code,
      created_at: newUser.created_at,
    };

    return NextResponse.json({
      success: true,
      user: userData,
      tokens: {
        accessToken,
        refreshToken,
      },
      referralBonus: referralBonusInfo,
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("duplicate key")) {
        return NextResponse.json(
          {
            success: false,
            error: "User already exists",
          },
          { status: 409 },
        );
      }

      if (error.message.includes("referral")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid referral code",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Registration failed. Please try again.",
      },
      { status: 500 },
    );
  }
}
