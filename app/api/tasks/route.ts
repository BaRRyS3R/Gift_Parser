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
        const telegramId = request.headers.get('X-Telegram-ID');

        console.log('Tasks API called with headers:', {
            userId,
            telegramId,
            hasUserId: !!userId,
            hasTelegramId: !!telegramId
        });

        if (!userId) {
            console.error('Missing X-User-ID header in tasks API');
            return NextResponse.json(
                {
                    success: false,
                    error: 'User authentication required'
                },
                { status: 401 }
            );
        }

        console.log(`Fetching tasks for user: ${userId}`);

        try {
            // Get tasks with completion status for user
            const tasks = await serverTasksService.getTasksForUser(userId);

            console.log(`Successfully fetched ${tasks.length} tasks for user ${userId}`);

            return NextResponse.json({
                success: true,
                data: tasks,
            });

        } catch (serviceError) {
            console.error('Error in serverTasksService.getTasksForUser:', serviceError);

            // More specific error handling based on service errors
            const errorMessage = serviceError instanceof Error ? serviceError.message : 'Unknown service error';

            if (errorMessage.includes('not found')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'User not found'
                    },
                    { status: 404 }
                );
            }

            if (errorMessage.includes('tasks')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to fetch tasks from database'
                    },
                    { status: 500 }
                );
            }

            if (errorMessage.includes('completions')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to fetch task completions'
                    },
                    { status: 500 }
                );
            }

            // Generic service error
            return NextResponse.json(
                {
                    success: false,
                    error: `Service error: ${errorMessage}`
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Unexpected error in tasks API:', error);

        // Handle different types of errors
        if (error instanceof Error) {
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });

            return NextResponse.json(
                {
                    success: false,
                    error: `Server error: ${error.message}`
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Unknown server error occurred'
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