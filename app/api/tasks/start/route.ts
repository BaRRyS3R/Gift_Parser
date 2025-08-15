// src/app/api/tasks/start/route.ts - Start task API route

import { NextRequest, NextResponse } from "next/server";

import { serverTasksService } from "@/lib/server/tasksService";
import { StartTaskRequest, StartTaskResponse } from "@/types/tasks";

/**
 * POST /api/tasks/start
 * Start a task for the authenticated user
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<StartTaskResponse>> {
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

    // Parse request body
    const body: StartTaskRequest = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: "Task ID is required",
        },
        { status: 400 },
      );
    }

    // Start the task
    const task = await serverTasksService.startTask(userId, taskId);

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Error starting task:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Task not found or inactive",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("already")) {
        return NextResponse.json(
          {
            success: false,
            error: "Task already started or completed",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to start task",
      },
      { status: 500 },
    );
  }
}

