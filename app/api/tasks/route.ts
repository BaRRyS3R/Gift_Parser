// src/app/api/tasks/route.ts - API endpoint for fetching user tasks

import type { TaskListResponse } from "@/types/tasks";

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { taskService } from "@/lib/taskService";

export const GET = withAuth(async (request) => {
  try {
    const { user } = request;

    console.log(`Fetching tasks for user ${user.telegramId}`);

    // Получаем все задания пользователя
    const tasks = await taskService.getUserTasks(user.userId);

    // Получаем статистику пользователя
    const stats = await taskService.getUserTaskStats(user.userId);

    const response: TaskListResponse = {
      success: true,
      tasks,
      total: tasks.length,
    };

    console.log(
      `Successfully fetched ${tasks.length} tasks for user ${user.telegramId}`,
    );

    return NextResponse.json({
      ...response,
      stats,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);

    const errorResponse: TaskListResponse = {
      success: false,
      tasks: [],
      total: 0,
      error: error instanceof Error ? error.message : "Failed to fetch tasks",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
});
