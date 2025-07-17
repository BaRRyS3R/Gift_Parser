// src/app/api/leaderboard/survival/route.ts - Защищенный endpoint для survival leaderboard

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";

// Безопасный интерфейс без sensitive данных
interface SafeSurvivalLeaderboardEntry {
    rank: number;
    displayName: string;
    username?: string;
    isPremium: boolean;
    bestSurvivalTime: number;
    maxLevel: number;
    bestStreak: number;
    survivalGames: number;
    isCurrentUser: boolean;
}

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

        // Получаем данные leaderboard через userService
        const leaderboardData = await userService.getSurvivalLeaderboard(limit);

        // Преобразуем данные в безопасный формат
        const safeLeaderboard: SafeSurvivalLeaderboardEntry[] = leaderboardData.map(
            (entry, index) => ({
                rank: index + 1,
                displayName: `${entry.first_name}${entry.last_name ? ` ${entry.last_name}` : ""}`,
                username: entry.username,
                isPremium: entry.is_premium,
                bestSurvivalTime: entry.best_survival_time,
                maxLevel: entry.max_level,
                bestStreak: entry.best_streak,
                survivalGames: entry.survival_games,
                isCurrentUser: entry.telegram_id === user.telegramId,
            })
        );

        return NextResponse.json({
            success: true,
            leaderboard: safeLeaderboard,
            total: safeLeaderboard.length,
        });
    } catch (error) {
        console.error("Error fetching survival leaderboard:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch survival leaderboard",
                message: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
});