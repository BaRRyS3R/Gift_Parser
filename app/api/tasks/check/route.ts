// src/app/api/tasks/check/route.ts - Проверка выполнения задания

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase_server';

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

        // Get task details first to determine how to check completion
        const { data: task, error: taskError } = await supabaseServer
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (taskError || !task) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Task not found'
                },
                { status: 404 }
            );
        }

        let isCompleted = false;

        // For telegram channels and chats, check membership through existing API
        if (task.type === 'telegram_channel' || task.type === 'telegram_chat') {
            if (!task.telegram_id) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Task configuration error: missing telegram_id'
                    },
                    { status: 500 }
                );
            }

            try {
                console.log(`Checking Telegram membership for chat_id: ${task.telegram_id}, user_id: ${telegramIdNumber}`);

                // Use existing telegram membership check endpoint
                const telegramCheckResponse = await fetch(`${request.nextUrl.origin}/api/check-telegram-membership`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: task.telegram_id,
                        user_id: telegramIdNumber,
                    }),
                });

                if (telegramCheckResponse.ok) {
                    const telegramResult = await telegramCheckResponse.json();
                    isCompleted = telegramResult.is_member || false;
                    console.log(`Telegram membership check result: ${isCompleted}`);
                } else {
                    const errorText = await telegramCheckResponse.text();
                    console.error('Telegram membership check failed:', telegramCheckResponse.status, errorText);
                    isCompleted = false;
                }
            } catch (telegramError) {
                console.error('Error calling telegram membership check:', telegramError);
                isCompleted = false;
            }
        } else {
            // For other task types (trust-based), assume completed
            console.log(`Task type ${task.type} is trust-based, marking as completed`);
            isCompleted = true;
        }

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