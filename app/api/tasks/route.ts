// src/app/api/tasks/route.ts - Main tasks API route

import { NextRequest, NextResponse } from 'next/server';
import { serverTasksService } from '@/lib/server/tasksService';
import { GetTasksResponse, TaskWithStatus, TaskStatus } from '@/types/tasks';

/**
 * GET /api/tasks
 * Get all tasks with user completion status
 */
export async function GET(request: NextRequest): Promise<NextResponse<GetTasksResponse>> {
    try {
        // Extract user info from middleware headers
        const userId = request.headers.get('X-User-ID');
        const telegramId = request.headers.get('X-Telegram-ID');

        if (!userId || !telegramId) {
            return NextResponse.json(
                {
                    success: false,
                    tasks: [],
                    error: 'User authentication required'
                },
                { status: 401 }
            );
        }

        console.log(`Fetching tasks for user ${telegramId}`);

        // Get tasks with user status
        const tasks = await serverTasksService.getUserTasksWithStatus(userId);

        // Categorize tasks for easier UI handling
        const categorized = {
            notStarted: tasks.filter(task => task.user_status === TaskStatus.NOT_STARTED),
            started: tasks.filter(task => task.user_status === TaskStatus.STARTED),
            completed: tasks.filter(task => task.user_status === TaskStatus.COMPLETED),
            rewarded: tasks.filter(task => task.user_status === TaskStatus.REWARDED),
        };

        console.log(`Successfully fetched ${tasks.length} tasks for user ${telegramId}:`, {
            notStarted: categorized.notStarted.length,
            started: categorized.started.length,
            completed: categorized.completed.length,
            rewarded: categorized.rewarded.length,
        });

        return NextResponse.json({
            success: true,
            tasks,
            categorized,
        });

    } catch (error) {
        console.error('Error fetching tasks:', error);

        return NextResponse.json(
            {
                success: false,
                tasks: [],
                error: 'Failed to fetch tasks'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/tasks
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}