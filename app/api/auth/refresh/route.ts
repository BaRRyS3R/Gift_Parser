// src/app/api/auth/refresh/route.ts - Token refresh endpoint

import { NextRequest, NextResponse } from "next/server";

import { serverUserService } from "@/lib/supabase_server";
import {
  verifyRefreshToken,
  createJWT,
  createRefreshToken,
  extractTokenFromHeader,
} from "@/lib/jwt";

// Response interface
interface RefreshResponse {
  success: boolean;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
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
  error?: string;
}

/**
 * POST /api/auth/refresh
 * Refreshes access token using valid refresh token
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<RefreshResponse>> {
  try {
    // Extract refresh token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const refreshToken = extractTokenFromHeader(authHeader);

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing refresh token",
        },
        { status: 401 },
      );
    }

    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken);

    // Find user by ID to get current data
    const user = await serverUserService.findByTelegramId(payload.telegramId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // Create new tokens
    const newAccessToken = await createJWT({
      userId: user.id,
      telegramId: user.telegram_id,
      telegramData: {
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code,
        is_premium: user.is_premium,
      },
      initDataHash: "refreshed", // Mark as refreshed token
    });

    const newRefreshToken = await createRefreshToken({
      userId: user.id,
      telegramId: user.telegram_id,
      telegramData: {
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code,
        is_premium: user.is_premium,
      },
    });

    // Prepare user data for response
    const userData = {
      id: user.id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: user.language_code,
      is_premium: user.is_premium,

      // Trust and moderation fields
      trust_score: user.trust_score,
      blocked_until: user.blocked_until,

      current_level: user.current_level,
      current_league_id: user.current_league_id,
      total_games: user.total_games,
      total_score: user.total_score,
      best_score: user.best_score,
      attempts_remaining: user.attempts_remaining,
      last_attempt_at: user.last_attempt_at,
      attempts_reset_at: user.attempts_reset_at,
      referral_code: user.referral_code,
      referral_count: user.referral_count,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_played_at: user.last_played_at,
    };

    return NextResponse.json({
      success: true,
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      user: userData,
    });
  } catch (error) {
    console.error("Token refresh error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        return NextResponse.json(
          {
            success: false,
            error: "Refresh token expired. Please log in again.",
          },
          { status: 401 },
        );
      }

      if (error.message.includes("Invalid")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid refresh token",
          },
          { status: 401 },
        );
      }

      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
          },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Token refresh failed. Please log in again.",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/auth/refresh
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
