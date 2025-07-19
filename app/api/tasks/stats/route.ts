// src/app/api/tasks/stats/route.ts - Статистика заданий пользователя

import { NextRequest, NextResponse } from 'next/server';
import { serverTasksService, type TaskStats } from '@/lib/server/tasksService';

// Response interface
interface TaskStatsResponse {
    success: boolean;
    data?: TaskStats;
    error?: string;
}

/**
 * GET /api/tasks/stats
 * Retrieves task statistics for the authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse<TaskStatsResponse>> {
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

        console.log(`Fetching task statistics for user: ${userId}`);

        // Get user task statistics
        const taskStats = await serverTasksService.getUserTaskStats(userId);

        console.log(`Successfully fetched task statistics for user ${userId}:`, {
            totalCompleted: taskStats.total_completed,
            totalAttemptsEarned: taskStats.total_attempts_earned,
            tasksCompletedToday: taskStats.tasks_completed_today
        });

        return NextResponse.json({
            success: true,
            data: taskStats,
        });

    } catch (error) {
        console.error('Error fetching task statistics:', error);

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
                        error: 'Failed to fetch task statistics'
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to retrieve task statistics'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/tasks/stats
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