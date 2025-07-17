// src/app/api/leaderboard/physics/route.ts - Защищенный endpoint для physics leaderboard

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";

// Безопасный интерфейс без sensitive данных
interface SafePhysicsLeaderboardEntry {
  rank: number;
  displayName: string;
  username?: string;
  isPremium: boolean;
  bestPhysicsScore: number;
  bestPhysicsTime: number;
  bestHits: number;
  leastMistakes: number;
  physicsGames: number;
  isCurrentUser: boolean;
}

export const GET = withAuth(async (request) => {
  try {
    const { user } = request;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    // Получаем данные leaderboard через userService
    const leaderboardData = await userService.getPhysicsLeaderboard(limit);

    // Преобразуем данные в безопасный формат
    const safeLeaderboard: SafePhysicsLeaderboardEntry[] = leaderboardData.map(
      (entry, index) => ({
        rank: index + 1,
        displayName: `${entry.first_name}${entry.last_name ? ` ${entry.last_name}` : ""}`,
        username: entry.username,
        isPremium: entry.is_premium,
        bestPhysicsScore: entry.best_physics_score,
        bestPhysicsTime: entry.best_physics_time,
        bestHits: entry.best_hits,
        leastMistakes: entry.least_mistakes,
        physicsGames: entry.physics_games,
        isCurrentUser: entry.telegram_id === user.telegramId,
      }),
    );

    return NextResponse.json({
      success: true,
      leaderboard: safeLeaderboard,
      total: safeLeaderboard.length,
    });
  } catch (error) {
    console.error("Error fetching physics leaderboard:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch physics leaderboard",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
