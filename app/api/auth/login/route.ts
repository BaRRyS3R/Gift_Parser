// src/app/api/auth/login/route.ts - Updated without OPTIONS handler

import type { TelegramUser } from "@/lib/supabase";

import { NextRequest, NextResponse } from "next/server";

import { serverUserService } from "@/lib/supabase_server";
import { serverBlockService } from "@/lib/server/blockService";
import { validateTelegramData, createInitDataHash } from "@/lib/telegram-auth";
import { createJWT, createRefreshToken } from "@/lib/jwt";

// Request body interface
interface LoginRequest {
  initData: string;
}

// Response interface with Nebula integration
interface LoginResponse {
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
    current_league_id?: number;
    total_games: number;
    total_score: number;
    best_score: number;
    attempts_remaining: number;
    last_attempt_at?: string;
    attempts_reset_at?: string;
    referral_code: string;
    referral_count: number;
    created_at: string;
    updated_at: string;
    last_played_at?: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  // Nebula security fields
  security?: {
    blocked: boolean;
    verificationRequired: boolean;
    verificationType?: "captcha" | "biometric" | "gyroscope";
    trustScore: number;
    blockInfo?: any;
  };
  error?: string;
}

/**
 * POST /api/auth/login
 * Authenticates existing user with Telegram WebApp data validation and Nebula security checks
 * 
 * CORS is now handled by middleware, no need for OPTIONS method here
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<LoginResponse>> {
  try {
    // Parse request body
    const body: LoginRequest = await request.json();
    const { initData } = body;

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

    // Find existing user
    const existingUser = await serverUserService.findByTelegramId(
      telegramUser.id,
    );

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found. Please register first.",
        },
        { status: 404 },
      );
    }

    // Update user data from Telegram (in case profile changed)
    const updatedUser = await serverUserService.updateUser(telegramUser.id, {
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username,
      language_code: telegramUser.language_code,
      is_premium: telegramUser.is_premium,
      updated_at: new Date().toISOString(),
    });

    // NEBULA SECURITY CHECKS
    // Step 1: Check if user is currently blocked
    const blockInfo = await serverBlockService.checkUserBlock(
      updatedUser.telegram_id,
    );

    if (blockInfo && blockInfo.isActive && blockInfo.timeRemainingSeconds > 0) {
      // Create limited tokens for accessing block status page
      const initDataHash = createInitDataHash(initData);
      const accessToken = await createJWT({
        userId: updatedUser.id,
        telegramId: updatedUser.telegram_id,
        telegramData: {
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          username: updatedUser.username,
          language_code: updatedUser.language_code,
          is_premium: updatedUser.is_premium,
        },
        initDataHash,
      });

      const refreshToken = await createRefreshToken({
        userId: updatedUser.id,
        telegramId: updatedUser.telegram_id,
        telegramData: {
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          username: updatedUser.username,
          language_code: updatedUser.language_code,
          is_premium: updatedUser.is_premium,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          telegram_id: updatedUser.telegram_id,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          username: updatedUser.username,
          language_code: updatedUser.language_code,
          is_premium: updatedUser.is_premium,
          trust_score: updatedUser.trust_score,
          blocked_until: updatedUser.blocked_until,
          current_level: updatedUser.current_level,
          current_league_id: updatedUser.current_league_id,
          total_games: updatedUser.total_games,
          total_score: updatedUser.total_score,
          best_score: updatedUser.best_score,
          attempts_remaining: updatedUser.attempts_remaining,
          last_attempt_at: updatedUser.last_attempt_at,
          attempts_reset_at: updatedUser.attempts_reset_at,
          referral_code: updatedUser.referral_code,
          referral_count: updatedUser.referral_count,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at,
          last_played_at: updatedUser.last_played_at,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
        security: {
          blocked: true,
          verificationRequired: false,
          trustScore: updatedUser.trust_score,
          blockInfo,
        },
      });
    }

    // Step 2: Check if user requires verification based on trust score
    const verificationReq =
      await serverBlockService.checkVerificationRequirement(
        updatedUser.telegram_id,
      );

    if (verificationReq.required && verificationReq.type) {
      // Create limited tokens for accessing verification page
      const initDataHash = createInitDataHash(initData);
      const accessToken = await createJWT({
        userId: updatedUser.id,
        telegramId: updatedUser.telegram_id,
        telegramData: {
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          username: updatedUser.username,
          language_code: updatedUser.language_code,
          is_premium: updatedUser.is_premium,
        },
        initDataHash,
      });

      const refreshToken = await createRefreshToken({
        userId: updatedUser.id,
        telegramId: updatedUser.telegram_id,
        telegramData: {
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          username: updatedUser.username,
          language_code: updatedUser.language_code,
          is_premium: updatedUser.is_premium,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          telegram_id: updatedUser.telegram_id,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          username: updatedUser.username,
          language_code: updatedUser.language_code,
          is_premium: updatedUser.is_premium,
          trust_score: updatedUser.trust_score,
          blocked_until: updatedUser.blocked_until,
          current_level: updatedUser.current_level,
          current_league_id: updatedUser.current_league_id,
          total_games: updatedUser.total_games,
          total_score: updatedUser.total_score,
          best_score: updatedUser.best_score,
          attempts_remaining: updatedUser.attempts_remaining,
          last_attempt_at: updatedUser.last_attempt_at,
          attempts_reset_at: updatedUser.attempts_reset_at,
          referral_code: updatedUser.referral_code,
          referral_count: updatedUser.referral_count,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at,
          last_played_at: updatedUser.last_played_at,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
        security: {
          blocked: false,
          verificationRequired: true,
          verificationType: verificationReq.type,
          trustScore: verificationReq.trustScore,
        },
      });
    }

    // Create full access JWT tokens
    const initDataHash = createInitDataHash(initData);

    const accessToken = await createJWT({
      userId: updatedUser.id,
      telegramId: updatedUser.telegram_id,
      telegramData: {
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        username: updatedUser.username,
        language_code: updatedUser.language_code,
        is_premium: updatedUser.is_premium,
      },
      initDataHash,
    });

    const refreshToken = await createRefreshToken({
      userId: updatedUser.id,
      telegramId: updatedUser.telegram_id,
      telegramData: {
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        username: updatedUser.username,
        language_code: updatedUser.language_code,
        is_premium: updatedUser.is_premium,
      },
    });

    // Prepare user data for response (excluding sensitive fields)
    const userData = {
      id: updatedUser.id,
      telegram_id: updatedUser.telegram_id,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      username: updatedUser.username,
      language_code: updatedUser.language_code,
      is_premium: updatedUser.is_premium,
      trust_score: updatedUser.trust_score,
      blocked_until: updatedUser.blocked_until,
      current_level: updatedUser.current_level,
      current_league_id: updatedUser.current_league_id,
      total_games: updatedUser.total_games,
      total_score: updatedUser.total_score,
      best_score: updatedUser.best_score,
      attempts_remaining: updatedUser.attempts_remaining,
      last_attempt_at: updatedUser.last_attempt_at,
      attempts_reset_at: updatedUser.attempts_reset_at,
      referral_code: updatedUser.referral_code,
      referral_count: updatedUser.referral_count,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
      last_played_at: updatedUser.last_played_at,
    };

    return NextResponse.json({
      success: true,
      user: userData,
      tokens: {
        accessToken,
        refreshToken,
      },
      security: {
        blocked: false,
        verificationRequired: false,
        trustScore: verificationReq.trustScore,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
          },
          { status: 404 },
        );
      }

      if (
        error.message.includes("Invalid") ||
        error.message.includes("validation")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid authentication data",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Authentication failed. Please try again.",
      },
      { status: 500 },
    );
  }
}

// OPTIONS метод удален - обрабатывается в middleware