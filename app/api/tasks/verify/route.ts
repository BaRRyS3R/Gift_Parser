// src/app/api/tasks/verify/route.ts - Verify task completion API route

import { NextRequest, NextResponse } from 'next/server';
import { serverTasksService } from '@/lib/server/tasksService';
import { VerifyTaskRequest, VerifyTaskResponse } from '@/types/tasks';
import { supabaseServer } from '@/lib/supabase_server';

/**
 * POST /api/tasks/verify
 * Verify task completion for the authenticated user
 */
export async function POST(request: NextRequest): Promise<NextResponse<VerifyTaskResponse>> {
    try {
        // Extract user info from middleware headers
        const userId = request.headers.get('X-User-ID');
        const telegramId = request.headers.get('X-Telegram-ID');

        console.log('Verify task request - Headers:', { userId, telegramId });

        if (!userId || !telegramId) {
            return NextResponse.json(
                {
                    success: false,
                    verified: false,
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
                    verified: false,
                    error: 'Invalid telegram ID'
                },
                { status: 400 }
            );
        }

        // Parse request body
        const body: VerifyTaskRequest = await request.json();
        const { taskId, verificationData } = body;

        console.log('Verify task request - Body:', { taskId, verificationData });

        if (!taskId) {
            return NextResponse.json(
                {
                    success: false,
                    verified: false,
                    error: 'Task ID is required'
                },
                { status: 400 }
            );
        }

        // Debug: Check if user task exists before verification
        console.log(`Checking user task existence for userId: ${userId}, taskId: ${taskId}`);
        
        try {
            // Additional debugging - check if the user and task exist
            const { data: debugUserTask, error: debugError } = await supabaseServer
                .from('user_tasks')
                .select('*')
                .eq('user_id', userId)
                .eq('task_id', taskId);

            console.log('Debug user task lookup:', { 
                found: debugUserTask?.length || 0,
                tasks: debugUserTask,
                error: debugError 
            });

            // Also check if task exists
            const { data: debugTask, error: debugTaskError } = await supabaseServer
                .from('tasks')
                .select('*')
                .eq('id', taskId);

            console.log('Debug task lookup:', { 
                found: debugTask?.length || 0,
                task: debugTask?.[0],
                error: debugTaskError 
            });

        } catch (debugErr) {
            console.error('Debug lookup error:', debugErr);
        }

        console.log(`Verifying task ${taskId} for user ${telegramId}`);

        // Verify the task
        const task = await serverTasksService.verifyTask(
            userId, 
            taskId, 
            telegramIdNumber,
            verificationData
        );

        console.log(`Task ${taskId} verified successfully for user ${telegramId}`);

        return NextResponse.json({
            success: true,
            verified: true,
            task,
        });

    } catch (error) {
        console.error('Error verifying task:', error);

        // Handle specific error types with more detailed logging
        if (error instanceof Error) {
            console.error('Detailed error info:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });

            if (error.message.includes('not found')) {
                return NextResponse.json(
                    {
                        success: false,
                        verified: false,
                        error: 'Task not found or not started'
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes('not in started state')) {
                return NextResponse.json(
                    {
                        success: false,
                        verified: false,
                        error: 'Task not in correct state for verification'
                    },
                    { status: 400 }
                );
            }

            if (error.message.includes('verification failed') || error.message.includes('not subscribed')) {
                return NextResponse.json(
                    {
                        success: true,
                        verified: false,
                        error: 'Verification failed - please complete the task and try again'
                    },
                    { status: 200 }
                );
            }

            if (error.message.includes('Telegram')) {
                return NextResponse.json(
                    {
                        success: false,
                        verified: false,
                        error: 'Telegram verification error - please try again'
                    },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                verified: false,
                error: 'Failed to verify task'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/tasks/verify
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