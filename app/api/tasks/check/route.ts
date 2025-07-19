// src/app/api/tasks/check/route.ts - Проверка выполнения задания

import { NextRequest, NextResponse } from 'next/server';
import { serverTasksService } from '@/lib/server/tasksService';

// Request body interface
interface CheckTaskRequest {
    taskId: string;
}

// Response interface
interface CheckTaskResponse {
    success: boolean;
    data?: {
        isCompleted: boolean;
        taskId: string;
    };
    error?: string;
}

/**
 * POST /api/tasks/check
 * Check task completion for the authenticated user
 */
export async function POST(request: NextRequest): Promise<NextResponse<CheckTaskResponse>> {
    try {
        // Extract user info from middleware headers
        const userId = request.headers.get('X-User-ID');
        const telegramId = request.headers.get('X-Telegram-ID');

        if (!userId || !telegramId) {
            return NextResponse.json(
                {
                    success: false,
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
                    error: 'Invalid telegram ID'
                },
                { status: 400 }
            );
        }

        // Parse request body
        const body: CheckTaskRequest = await request.json();
        const { taskId } = body;

        if (!taskId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Task ID is required'
                },
                { status: 400 }
            );
        }

        console.log(`Checking task completion: ${taskId} for user ${userId}`);

        // Check task completion
        const isCompleted = await serverTasksService.checkTaskCompletion(
            userId,
            taskId,
            telegramIdNumber
        );

        console.log(`Task ${taskId} completion check result: ${isCompleted}`);

        return NextResponse.json({
            success: true,
            data: {
                isCompleted,
                taskId
            },
        });

    } catch (error) {
        console.error('Error checking task completion:', error);

        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Task not found'
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes('Telegram ID not specified')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Task configuration error'
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to check task completion'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/tasks/check
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}