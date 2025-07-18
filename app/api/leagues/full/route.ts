// src/app/api/leagues/full/route.ts - Complete league information API for leagues modal

import { NextRequest, NextResponse } from 'next/server';
import { serverLeaguesService, type FullLeagueData } from '@/lib/server/leaguesService';

// Response interface for API
interface LeagueFullAPIResponse {
    success: boolean;
    data?: FullLeagueData;
    error?: string;
}

/**
 * GET /api/leagues/full
 * Get complete league information for leagues modal
 * Includes progress, all leagues, rewards, leaderboards, neighbors, and all rewards
 * 
 * WARNING: This endpoint returns sanitized data that excludes user_id and telegram_id
 * of other users for security reasons. Only display names and usernames are included.
 */
export async function GET(request: NextRequest): Promise<NextResponse<LeagueFullAPIResponse>> {
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

        console.log(`Fetching full league data for user: ${userId}, games: ${user.total_games}`);

        // Get complete league data
        const leagueData = await serverLeaguesService.getFullLeagueData(userId, user.total_games);

        console.log(`Successfully fetched full league data for user: ${userId}`, {
            currentLeague: leagueData.progress.currentLeague.name,
            allLeaguesCount: leagueData.allLeagues.length,
            userRewardsCount: leagueData.userRewards.length,
            leaderboardsCount: Object.keys(leagueData.leaderboards).length,
            hasNeighbors: !!leagueData.neighbors,
            allRewardsCount: Object.keys(leagueData.allLeagueRewards).length
        });

        return NextResponse.json({
            success: true,
            data: leagueData,
        });

    } catch (error) {
        console.error('Error fetching full league data:', error);

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

            if (error.message.includes('Unable to get league progress')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'League progress data unavailable'
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes('Failed to get league data')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'League data retrieval failed'
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch league information'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/leagues/full
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