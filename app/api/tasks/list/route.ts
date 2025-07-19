// src/app/api/tasks/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/supabase_tasks';
import type { TaskWithCompletion } from '@/types/tasks';

interface TaskListResponse {
    success: boolean;
    tasks: TaskWithCompletion[];
    stats?: {
        total_completed: number;
        total_attempts_earned: number;
        tasks_completed_today: number;
    };
    error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<TaskListResponse>> {
    try {
        // Extract user info from middleware headers
        const telegramId = request.headers.get('X-Telegram-ID');
        const userId = request.headers.get('X-User-ID');

        if (!telegramId || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    tasks: [],
                    error: 'User authentication required'
                },
                { status: 401 }
            );
        }

        const telegramIdNumber = parseInt(telegramId);
        if (isNaN(telegramIdNumber)) {
            return NextResponse.json(
                {
                    success: false,
                    tasks: [],
                    error: 'Invalid user ID'
                },
                { status: 400 }
            );
        }

        console.log(`Fetching tasks for user ${telegramIdNumber}`);

        // Get tasks for user
        const tasks = await taskService.getTasksForUser(userId);

        // Get user task stats
        const stats = await taskService.getUserTaskStats(userId);

        console.log(`Successfully fetched ${tasks.length} tasks for user ${telegramIdNumber}`);

        return NextResponse.json({
            success: true,
            tasks,
            stats,
        });

    } catch (error) {
        console.error('Error fetching tasks:', error);

        return NextResponse.json(
            {
                success: false,
                tasks: [],
                error: error instanceof Error ? error.message : 'Failed to fetch tasks'
            },
            { status: 500 }
        );
    }
}

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