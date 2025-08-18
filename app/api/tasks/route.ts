// src/app/api/tasks/route.ts - Main tasks API route

import { NextRequest, NextResponse } from "next/server";

import { serverTasksService } from "@/lib/server/tasksService";
import { GetTasksResponse, TaskStatus } from "@/types/tasks";

/**
 * GET /api/tasks
 * Get all tasks with user completion status
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<GetTasksResponse>> {
  try {
    // Extract user info from middleware headers
    const userId = request.headers.get("X-User-ID");
    const telegramId = request.headers.get("X-Telegram-ID");

    if (!userId || !telegramId) {
      return NextResponse.json(
        {
          success: false,
          tasks: [],
          error: "User authentication required",
        },
        { status: 401 },
      );
    }

    // Get tasks with user status
    const tasks = await serverTasksService.getUserTasksWithStatus(userId);

    // Categorize tasks for easier UI handling
    const categorized = {
      notStarted: tasks.filter(
        (task) => task.user_status === TaskStatus.NOT_STARTED,
      ),
      started: tasks.filter((task) => task.user_status === TaskStatus.STARTED),
      completed: tasks.filter(
        (task) => task.user_status === TaskStatus.COMPLETED,
      ),
      rewarded: tasks.filter(
        (task) => task.user_status === TaskStatus.REWARDED,
      ),
    };

    return NextResponse.json({
      success: true,
      tasks,
      categorized,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);

    return NextResponse.json(
      {
        success: false,
        tasks: [],
        error: "Failed to fetch tasks",
      },
      { status: 500 },
    );
  }
}
