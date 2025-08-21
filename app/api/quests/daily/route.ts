// src/app/api/quests/daily/route.ts - Fixed type issues

import { NextRequest, NextResponse } from "next/server";
import { serverDailyQuestsService } from "@/lib/server/dailyQuestsService";
import type { DailyQuestResponse } from "@/types/daily-quests";

/**
 * GET /api/quests/daily
 * Get current daily quest with user progress
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<DailyQuestResponse>> {
  try {
    // Extract user info from middleware headers
    const userId = request.headers.get("X-User-ID");
    const telegramId = request.headers.get("X-Telegram-ID");

    if (!userId || !telegramId) {
      return NextResponse.json(
        {
          success: false,
          error: "User authentication required",
        },
        { status: 401 },
      );
    }

    // Get current daily quest with user progress
    const questWithProgress = await serverDailyQuestsService
      .getCurrentDailyQuestWithProgress(userId);

    return NextResponse.json({
      success: true,
      quest: questWithProgress || undefined, // Convert null to undefined
    });

  } catch (error) {
    console.error("Error fetching daily quest:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch daily quest",
      },
      { status: 500 },
    );
  }
}