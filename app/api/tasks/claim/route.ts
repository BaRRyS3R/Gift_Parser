// src/app/api/tasks/claim/route.ts - Получение награды за выполненное задание

import { NextRequest, NextResponse } from 'next/server';
import { serverTasksService, type TaskRewardResult } from '@/lib/server/tasksService';

// Request body interface
interface ClaimTaskRequest {
    taskId: string;
}

// Response interface
interface ClaimTaskResponse {
    success: boolean;
    data?: TaskRewardResult;
    error?: string;
}

/**
 * POST /api/tasks/claim
 * Claim reward for completed task for the authenticated user
 */
export async function POST(request: NextRequest): Promise<NextResponse<ClaimTaskResponse>> {
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
        const body: ClaimTaskRequest = await request.json();
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

        console.log(`Claiming reward for task ${taskId} for user ${userId}`);

        // Claim task reward
        const rewardResult = await serverTasksService.claimTaskReward(userId, taskId);

        console.log(`Reward claimed successfully for task ${taskId}: ${rewardResult.reward} attempts`);

        return NextResponse.json({
            success: true,
            data: rewardResult,
        });

    } catch (error) {
        console.error('Error claiming task reward:', error);

        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Completed task not found'
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes('User not found')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'User not found'
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes('update user attempts')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to update user attempts'
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to claim task reward'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/tasks/claim
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