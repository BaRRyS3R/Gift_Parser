// src/app/api/league/all/route.ts - Get all league data for user

import { NextRequest, NextResponse } from 'next/server';
import { serverLeagueService, type AllLeagueDataResponse } from '@/lib/server/leagueService';
import { serverUserService } from '@/lib/supabase_server';

// Response interface
interface LeagueDataResponse {
    success: boolean;
    data?: AllLeagueDataResponse;
    error?: string;
}

/**
 * GET /api/league/all
 * Get comprehensive league data for the authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse<LeagueDataResponse>> {
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

        // Get user data to fetch total games
        const user = await serverUserService.findByTelegramId(telegramIdNumber);
        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found'
                },
                { status: 404 }
            );
        }

        console.log(`Fetching league data for user ${telegramIdNumber} with ${user.total_games} games`);

        // Get all league data using server service
        const leagueData = await serverLeagueService.getAllLeagueData(userId, user.total_games);

        console.log('League data fetched successfully:', {
            hasProgress: !!leagueData.progress,
            leaguesCount: leagueData.allLeagues.length,
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
        console.error('Error fetching league data:', error);

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

            if (error.message.includes('Failed to fetch')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Database error occurred'
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch league data'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/league/all
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