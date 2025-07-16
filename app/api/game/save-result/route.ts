// src/app/api/game/save-result/route.ts - Game save result API endpoint

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";
import { userService } from "@/lib/supabase";
import leagueService from "@/lib/league_service";
import { GameMode } from "@/types/game-modes/common";

export async function POST(request: NextRequest) {
  try {
    // Get user ID from middleware-added header
    const userId = request.headers.get("x-user-id");
    const telegramId = request.headers.get("x-telegram-id");

    if (!userId || !telegramId) {
      return NextResponse.json(
        {
          success: false,
          error: "User authentication required",
        },
        { status: 401 },
      );
    }

    // Parse game result from request body
    const gameResult = await request.json();

    if (!gameResult || !gameResult.mode || gameResult.score === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid game result data",
        },
        { status: 400 },
      );
    }

    // Get user data
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error("Database error fetching user:", userError);
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
          message: userError?.message,
        },
        { status: 404 },
      );
    }

    // Determine if this is a competitive mode (affects total_games counting)
    const isCompetitiveMode = gameResult.mode !== GameMode.REACTION;
    const previousTotalGames = user.total_games;
    const newTotalGames = isCompetitiveMode ? previousTotalGames + 1 : previousTotalGames;

    // Calculate new level
    const previousLevel = user.current_level;
    const newLevel = leagueService.calculateLevel(newTotalGames);

    // Prepare base updates
    const updates: any = {
      total_games: newTotalGames,
      total_score: user.total_score + gameResult.score,
      best_score: Math.max(user.best_score, gameResult.score),
      current_level: newLevel,
      last_played_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mode-specific stats updates
    if (gameResult.mode === GameMode.REACTION) {
      updates.reaction_games = user.reaction_games + 1;
      updates.reaction_best_score = Math.max(user.reaction_best_score || 0, gameResult.score);

      if (!gameResult.missed && gameResult.reactionTime > 0) {
        updates.reaction_best_time = user.reaction_best_time > 0
          ? Math.min(user.reaction_best_time, gameResult.reactionTime)
          : gameResult.reactionTime;

        const totalReactionGames = user.reaction_games;
        const currentAverage = user.reaction_average_time || 0;
        const newAverage = totalReactionGames > 0
          ? (currentAverage * totalReactionGames + gameResult.reactionTime) / (totalReactionGames + 1)
          : gameResult.reactionTime;

        updates.reaction_average_time = Math.round(newAverage);
      }
    } else if (gameResult.mode === GameMode.SURVIVAL) {
      updates.survival_games = user.survival_games + 1;
      updates.survival_best_score = Math.max(user.survival_best_score || 0, gameResult.score);
      updates.survival_best_time = Math.max(user.survival_best_time || 0, gameResult.survivalTime);
      updates.survival_max_level = Math.max(user.survival_max_level || 0, gameResult.maxLevelReached);
      updates.survival_best_streak = Math.max(user.survival_best_streak || 0, gameResult.perfectStreak);
    } else if (gameResult.mode === GameMode.PHYSICS) {
      updates.physics_games = user.physics_games + 1;
      updates.physics_best_score = Math.max(user.physics_best_score || 0, gameResult.score);
      updates.physics_best_time = Math.max(user.physics_best_time || 0, Math.round(gameResult.gameTime));
      updates.physics_total_hits = (user.physics_total_hits || 0) + gameResult.totalHits;
      updates.physics_best_hits = Math.max(user.physics_best_hits || 0, gameResult.totalHits);

      if (user.physics_least_mistakes === undefined || user.physics_least_mistakes === null) {
        updates.physics_least_mistakes = gameResult.mistakesMade;
      } else {
        updates.physics_least_mistakes = Math.min(user.physics_least_mistakes, gameResult.mistakesMade);
      }
    } else if (gameResult.mode === GameMode.ROTATION) {
      updates.rotation_games = user.rotation_games + 1;
      updates.rotation_best_score = Math.max(user.rotation_best_score || 0, gameResult.score);
      updates.rotation_best_time = Math.max(user.rotation_best_time || 0, gameResult.survivalTime);
      updates.rotation_max_level = Math.max(user.rotation_max_level || 0, gameResult.maxLevelReached);
      updates.rotation_best_streak = Math.max(user.rotation_best_streak || 0, gameResult.perfectStreak);
      updates.rotation_total_hits = (user.rotation_total_hits || 0) + gameResult.correctHits;
    }

    // Update user stats
    const { error: updateError } = await supabaseServer
      .from("users")
      .update(updates)
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user stats:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save game result",
          message: updateError.message,
        },
        { status: 500 },
      );
    }

    // Check league changes only for competitive modes
    let leagueResult: any = {
      leagueChanged: false,
      levelChanged: newLevel !== previousLevel,
      newLevel: newLevel !== previousLevel ? newLevel : undefined,
    };

    if (isCompetitiveMode) {
      try {
        const leagueCheckResult = await leagueService.checkAndUpdateLeague(userId, newTotalGames);
        leagueResult = {
          ...leagueResult,
          leagueChanged: leagueCheckResult.leagueChanged,
          newLeague: leagueCheckResult.newLeague,
          reward: leagueCheckResult.reward,
          missedRewards: leagueCheckResult.missedRewards,
        };
      } catch (leagueError) {
        console.error("Error checking league after game:", leagueError);
        leagueResult.error = "League check failed";
      }
    }

    return NextResponse.json({
      success: true,
      saveResult: {
        success: true,
        ...leagueResult,
      },
    });
  } catch (error) {
    console.error("Save game result API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}