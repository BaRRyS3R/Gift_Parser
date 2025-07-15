// src/app/api/profile/achievements/route.ts - Protected achievements endpoint
import { NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";
import { AchievementService } from "@/lib/achievementService";

export const GET = withAuth(async (request) => {
  try {
    const { user } = request;

    const userData = await userService.findByTelegramId(user.telegramId);

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Get user rankings for achievements calculation
    const [overallRank, reactionRank, survivalRank, physicsRank, rotationRank] =
      await Promise.all([
        userService.getUserRanking(user.telegramId),
        userService.getUserReactionRanking(user.telegramId),
        userService.getUserSurvivalRanking(user.telegramId),
        userService.getUserPhysicsRanking(user.telegramId),
        userService.getUserRotationRanking(user.telegramId),
      ]);

    const rankings = {
      overall: overallRank,
      reaction: reactionRank,
      survival: survivalRank,
      physics: physicsRank,
      rotation: rotationRank,
    };

    const achievements = AchievementService.calculateAchievements(
      userData,
      rankings,
    );
    const stats = AchievementService.getAchievementStats(achievements);

    return NextResponse.json({
      success: true,
      achievements: {
        categories: achievements,
        stats,
      },
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch achievements" },
      { status: 500 },
    );
  }
});
