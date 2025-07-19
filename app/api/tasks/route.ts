// src/app/api/tasks/route.ts - Получение всех задач пользователя

import { NextRequest, NextResponse } from 'next/server';
import { serverTasksService, type TaskWithCompletion } from '@/lib/server/tasksService';

// Response interface
interface TasksResponse {
    success: boolean;
    data?: TaskWithCompletion[];
    error?: string;
}

/**
 * GET /api/tasks
 * Retrieves all tasks with completion status for the authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse<TasksResponse>> {
    try {
        // Extract user info from middleware headers
        const userId = request.headers.get('X-User-ID');

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User authentication required'
                },
                { status: 401 }
            );
        }

        console.log(`Fetching tasks for user: ${userId}`);

        // Get tasks with completion status for user
        const tasks = await serverTasksService.getTasksForUser(userId);

        console.log(`Successfully fetched ${tasks.length} tasks for user ${userId}`);

        return NextResponse.json({
            success: true,
            data: tasks,
        });

    } catch (error) {
        console.error('Error fetching user tasks:', error);

        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'User not found'
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes('fetch')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to fetch tasks'
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to retrieve tasks'
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