// src/app/api/tasks/claim/route.ts - Claim task reward API route

import { NextRequest, NextResponse } from "next/server";

import { serverTasksService } from "@/lib/server/tasksService";
import { ClaimRewardRequest, ClaimRewardResponse } from "@/types/tasks";

/**
 * POST /api/tasks/claim
 * Claim reward for completed task
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
          newAttemptsTotal: 0,
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
          newAttemptsTotal: 0,
          error: "Task ID is required",
        },
        { status: 400 },
      );
    }

    console.log(`Claiming reward for task ${taskId} by user ${telegramId}`);

    // Claim the reward
    const result = await serverTasksService.claimTaskReward(userId, taskId);

    console.log(
      `Reward claimed successfully for task ${taskId} by user ${telegramId}:`,
      {
        attemptsAdded: result.attemptsAdded,
        newAttemptsTotal: result.newAttemptsTotal,
      },
    );

    return NextResponse.json({
      success: true,
      attemptsAdded: result.attemptsAdded,
      newAttemptsTotal: result.newAttemptsTotal,
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
            newAttemptsTotal: 0,
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
            newAttemptsTotal: 0,
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
            newAttemptsTotal: 0,
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
            newAttemptsTotal: 0,
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
        newAttemptsTotal: 0,
        error: "Failed to claim task reward",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/tasks/claim
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
