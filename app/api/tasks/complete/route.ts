// src/app/api/tasks/complete/route.ts - API endpoint for completing tasks with enhanced user lookup

import type {
  TaskCompletionRequest,
  TaskCompletionResponse,
} from "@/types/tasks";

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { taskService } from "@/lib/taskService";

export const POST = withAuth(async (request) => {
  try {
    const { user } = request;

    console.log(
      `Task completion request from user: ${user.userId}, telegram_id: ${user.telegramId}`,
    );

    // Parse request body
    let requestBody: TaskCompletionRequest;

    try {
      requestBody = await request.json();
    } catch (error) {
      console.error("Error parsing request body:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body",
          attempts_awarded: 0,
          new_attempts_total: 0,
          error: "Invalid request body",
        } as TaskCompletionResponse,
        { status: 400 },
      );
    }

    const { taskId, verificationData } = requestBody;

    // Validate input
    if (!taskId || typeof taskId !== "number") {
      console.error("Invalid task ID:", taskId);

      return NextResponse.json(
        {
          success: false,
          message: "Task ID is required",
          attempts_awarded: 0,
          new_attempts_total: 0,
          error: "Task ID is required",
        } as TaskCompletionResponse,
        { status: 400 },
      );
    }

    console.log(
      `User ${user.telegramId} (${user.userId}) attempting to complete task ${taskId}`,
    );

    // ENHANCED: Complete the task with telegramId fallback
    const completionResult = await taskService.completeTask(
      user.userId,
      taskId,
      verificationData,
      user.telegramId, // Pass telegramId for fallback lookup
    );

    if (!completionResult.success) {
      console.warn(
        `Task completion failed for user ${user.telegramId}, task ${taskId}: ${completionResult.error}`,
      );

      return NextResponse.json(completionResult, { status: 400 });
    }

    console.log(
      `Task ${taskId} completed successfully by user ${user.telegramId} (${user.userId}), awarded ${completionResult.attempts_awarded} attempts`,
    );

    return NextResponse.json(completionResult);
  } catch (error) {
    console.error("Error completing task:", error);

    const errorResponse: TaskCompletionResponse = {
      success: false,
      message: "Failed to complete task",
      attempts_awarded: 0,
      new_attempts_total: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
});
