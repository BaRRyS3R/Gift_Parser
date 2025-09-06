// src/app/api/tasks/claim/route.ts - Updated with differentiated reward system

import { NextRequest, NextResponse } from "next/server";

import { serverTasksService } from "@/lib/server/tasksService";
import { ClaimRewardRequest, ClaimRewardResponse } from "@/types/tasks";

/**
 * POST /api/tasks/claim
 * Claim reward for completed task with differentiated reward types
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ClaimRewardResponse>> {
  try {
    // Extract user info from middleware headers
    const userId = request.headers.get("X-User-ID");
    const telegramId = request.headers.get("X-Telegram-ID");

    if (!userId || !telegramId) {
      return NextResponse.json(
        {
          success: false,
          attemptsAdded: 0,
          bonusRestoreAdded: 0,
          rewardType: 'attempts',
          newAttemptsTotal: 0,
          newBonusRestoreTotal: 0,
          error: "User authentication required",
        },
        { status: 401 },
      );
    }

    // Parse request body
    const body: ClaimRewardRequest = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          attemptsAdded: 0,
          bonusRestoreAdded: 0,
          rewardType: 'attempts',
          newAttemptsTotal: 0,
          newBonusRestoreTotal: 0,
          error: "Task ID is required",
        },
        { status: 400 },
      );
    }

    // Claim the reward with enhanced response
    const result = await serverTasksService.claimTaskReward(userId, taskId);

    console.log(`[API] Task reward claimed: ${result.rewardType === 'restore_bonus' ? result.bonusRestoreAdded + ' restore bonus' : result.attemptsAdded + ' attempts'}`);

    return NextResponse.json({
      success: true,
      attemptsAdded: result.attemptsAdded,
      bonusRestoreAdded: result.bonusRestoreAdded,
      rewardType: result.rewardType,
      newAttemptsTotal: result.newAttemptsTotal,
      newBonusRestoreTotal: result.newBonusRestoreTotal,
      task: result.taskWithStatus,
    });
  } catch (error) {
    console.error("Error claiming task reward:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            attemptsAdded: 0,
            bonusRestoreAdded: 0,
            rewardType: 'attempts',
            newAttemptsTotal: 0,
            newBonusRestoreTotal: 0,
            error: "Task not found",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("not completed")) {
        return NextResponse.json(
          {
            success: false,
            attemptsAdded: 0,
            bonusRestoreAdded: 0,
            rewardType: 'attempts',
            newAttemptsTotal: 0,
            newBonusRestoreTotal: 0,
            error: "Task must be completed before claiming reward",
          },
          { status: 400 },
        );
      }

      if (
        error.message.includes("already rewarded") ||
        error.message.includes("already claimed")
      ) {
        return NextResponse.json(
          {
            success: false,
            attemptsAdded: 0,
            bonusRestoreAdded: 0,
            rewardType: 'attempts',
            newAttemptsTotal: 0,
            newBonusRestoreTotal: 0,
            error: "Reward already claimed for this task",
          },
          { status: 400 },
        );
      }

      if (error.message.includes("User not found")) {
        return NextResponse.json(
          {
            success: false,
            attemptsAdded: 0,
            bonusRestoreAdded: 0,
            rewardType: 'attempts',
            newAttemptsTotal: 0,
            newBonusRestoreTotal: 0,
            error: "User not found",
          },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        attemptsAdded: 0,
        bonusRestoreAdded: 0,
        rewardType: 'attempts',
        newAttemptsTotal: 0,
        newBonusRestoreTotal: 0,
        error: "Failed to claim task reward",
      },
      { status: 500 },
    );
  }
}