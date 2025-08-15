// src/app/api/user/achievements/route.ts - User achievements endpoint

import { NextRequest, NextResponse } from "next/server";

import {
  serverAchievementsService,
  type UserAchievementsData,
} from "@/lib/server/achievementsService";

// Response interface
interface AchievementsResponse {
  success: boolean;
  data?: UserAchievementsData;
  error?: string;
}

/**
 * GET /api/user/achievements
 * Retrieves user achievements with unlock status and rewards
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<AchievementsResponse>> {
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

    // Get user achievements data
    const achievementsData =
      await serverAchievementsService.getUserAchievements(telegramIdNumber);

    return NextResponse.json({
      success: true,
      data: achievementsData,
    });
  } catch (error) {
    console.error("Error fetching user achievements:", error);

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
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve achievements",
      },
      { status: 500 },
    );
  }
}

