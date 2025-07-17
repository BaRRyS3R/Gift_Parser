// src/app/api/leaderboard/reaction/route.ts - Защищенный endpoint для reaction leaderboard

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";

// Безопасный интерфейс без sensitive данных
interface SafeReactionLeaderboardEntry {
    rank: number;
    displayName: string;
    username?: string;
    isPremium: boolean;
    bestReactionTime: number;
    reactionGames: number;
    bestReactionScore: number;
    isCurrentUser: boolean;
}

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

        // Получаем данные leaderboard через userService
        const leaderboardData = await userService.getReactionLeaderboard(limit);

        // Преобразуем данные в безопасный формат
        const safeLeaderboard: SafeReactionLeaderboardEntry[] = leaderboardData.map(
            (entry, index) => ({
                rank: index + 1,
                displayName: `${entry.first_name}${entry.last_name ? ` ${entry.last_name}` : ""}`,
                username: entry.username,
                isPremium: entry.is_premium,
                bestReactionTime: entry.best_reaction_time,
                reactionGames: entry.reaction_games,
                bestReactionScore: entry.best_reaction_score,
                isCurrentUser: entry.telegram_id === user.telegramId,
            })
        );

        return NextResponse.json({
            success: true,
            leaderboard: safeLeaderboard,
            total: safeLeaderboard.length,
        });
    } catch (error) {
        console.error("Error fetching reaction leaderboard:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch reaction leaderboard",
                message: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
});