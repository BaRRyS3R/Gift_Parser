// src/app/api/tasks/complete/route.ts - Завершение задания

import { NextRequest, NextResponse } from 'next/server';
import { serverTasksService, type UserTaskCompletion } from '@/lib/server/tasksService';

// Request body interface
interface CompleteTaskRequest {
    taskId: string;
}

// Response interface
interface CompleteTaskResponse {
    success: boolean;
    data?: UserTaskCompletion;
    error?: string;
}

/**
 * POST /api/tasks/complete
 * Complete task execution for the authenticated user
 */
export async function POST(request: NextRequest): Promise<NextResponse<CompleteTaskResponse>> {
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

        // Parse request body
        const body: CompleteTaskRequest = await request.json();
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

        console.log(`Completing task ${taskId} for user ${userId}`);

        // Complete task execution
        const taskCompletion = await serverTasksService.completeTask(userId, taskId);

        console.log(`Task ${taskId} completed successfully for user ${userId}`);

        return NextResponse.json({
            success: true,
            data: taskCompletion,
        });

    } catch (error) {
        console.error('Error completing task:', error);

        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('not started')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Task completion not found or task was not started'
                    },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to complete task'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/tasks/complete
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