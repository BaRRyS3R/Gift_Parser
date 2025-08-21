// src/app/api/quests/stats/route.ts - Get quest statistics (admin)

import { NextRequest, NextResponse } from "next/server";
import { serverDailyQuestsService } from "@/lib/server/dailyQuestsService";

/**
 * GET /api/quests/stats?questId=xxx
 * Get quest statistics (for admin purposes)
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    // Extract quest ID from query parameters
    const url = new URL(request.url);
    const questId = url.searchParams.get("questId");

    if (!questId) {
      return NextResponse.json(
        {
          success: false,
          error: "Quest ID is required",
        },
        { status: 400 },
      );
    }

    // Get quest statistics
    const stats = await serverDailyQuestsService.getQuestStatistics(questId);

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error("Error fetching quest statistics:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch quest statistics",
      },
      { status: 500 },
    );
  }
}