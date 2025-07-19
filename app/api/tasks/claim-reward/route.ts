// src/app/api/tasks/claim-reward/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/supabase_tasks';

interface ClaimRewardRequest {
    taskId: string;
}

interface ClaimRewardResponse {
    success: boolean;
    reward?: {
        attempts: number;
        taskName: string;
    };
    newAttemptsTotal?: number;
    message?: string;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ClaimRewardResponse>> {
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
        let requestBody: ClaimRewardRequest;
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

        console.log(`User ${telegramIdNumber} claiming reward for task ${taskId}`);

        // Claim task reward
        const result = await taskService.claimTaskReward(userId, taskId, telegramIdNumber);

        console.log(`Reward claimed for task ${taskId} by user ${telegramIdNumber}: +${result.reward} attempts`);

        return NextResponse.json({
            success: true,
            reward: {
                attempts: result.reward,
                taskName: result.completion.task?.name || 'Task'
            },
            message: `Reward claimed: +${result.reward} attempts`
        });

    } catch (error) {
        console.error('Error claiming task reward:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to claim reward'
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