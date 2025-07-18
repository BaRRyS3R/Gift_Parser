// src/app/api/leagues/progress/route.ts - Compact league progress API for main page

import { NextRequest, NextResponse } from 'next/server';
import { serverLeaguesService, type CompactLeagueData } from '@/lib/server/leaguesService';

// Response interface for API
interface LeagueProgressAPIResponse {
    success: boolean;
    data?: CompactLeagueData;
    error?: string;
}

/**
 * GET /api/leagues/progress
 * Get compact league progress data for main page display
 * Returns current league, level, and progress information
 */
export async function GET(request: NextRequest): Promise<NextResponse<LeagueProgressAPIResponse>> {
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

        // Get user's current game count for league calculation
        const { data: user, error: userError } = await import('@/lib/supabase_server')
            .then(module => module.supabaseServer
                .from('users')
                .select('total_games')
                .eq('id', userId)
                .single()
            );

        if (userError || !user) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found'
                },
                { status: 404 }
            );
        }

        console.log(`Fetching league progress for user: ${userId}, games: ${user.total_games}`);

        // Get compact league data
        const leagueData = await serverLeaguesService.getCompactLeagueData(userId, user.total_games);

        if (!leagueData) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'League data not available'
                },
                { status: 404 }
            );
        }

        console.log(`Successfully fetched league progress for user: ${userId}`, {
            currentLeague: leagueData.currentLeague.name,
            currentLevel: leagueData.currentLevel,
            progressPercent: leagueData.progressPercent
        });

        return NextResponse.json({
            success: true,
            data: leagueData,
        });

    } catch (error) {
        console.error('Error fetching league progress:', error);

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
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch league progress'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/leagues/progress
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