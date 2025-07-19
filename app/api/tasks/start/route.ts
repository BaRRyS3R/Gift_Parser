// src/app/api/tasks/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/supabase_tasks';
import type { UserTaskCompletion } from '@/types/tasks';

interface StartTaskRequest {
    taskId: string;
}

interface StartTaskResponse {
    success: boolean;
    completion?: UserTaskCompletion;
    message?: string;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<StartTaskResponse>> {
    try {
        // Extract user info from middleware headers
        const telegramId = request.headers.get('X-Telegram-ID');
        const userId = request.headers.get('X-User-ID');

        if (!telegramId || !userId) {
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
                    error: 'Invalid user ID'
                },
                { status: 400 }
            );
        }

        // Parse request body
        let requestBody: StartTaskRequest;
        try {
            requestBody = await request.json();
        } catch (error) {
            return NextResponse.json(
                { success: false, error: 'Invalid request body' },
                { status: 400 }
            );
        }

        const { taskId } = requestBody;

        if (!taskId) {
            return NextResponse.json(
                { success: false, error: 'Task ID is required' },
                { status: 400 }
            );
        }

        console.log(`User ${telegramIdNumber} starting task ${taskId}`);

        // Start the task
        const completion = await taskService.startTask(userId, taskId);

        console.log(`Task ${taskId} started successfully for user ${telegramIdNumber}`);

        return NextResponse.json({
            success: true,
            completion,
            message: 'Task started successfully'
        });

    } catch (error) {
        console.error('Error starting task:', error);

        if (error instanceof Error && error.message.includes('cannot be completed')) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to start task'
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
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}