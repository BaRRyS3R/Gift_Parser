// src/app/api/leagues/route.ts - Complete leagues API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { serverLeagueService, type CompleteLeagueData } from '@/lib/server/leagueServerService';
import { serverUserService } from '@/lib/supabase_server';

// Response interface
interface LeaguesResponse {
    success: boolean;
    data?: CompleteLeagueData;
    error?: string;
}

/**
 * GET /api/leagues
 * Retrieves complete league data for user including progress, rewards, leaderboards, and neighbors
 */
export async function GET(request: NextRequest): Promise<NextResponse<LeaguesResponse>> {
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

        // Get user data directly from database (more efficient than internal HTTP request)
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

        // Get user data directly from server service
        const userData = await serverUserService.findByTelegramId(telegramIdNumber);
        if (!userData) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found'
                },
                { status: 404 }
            );
        }

        const totalGames = userData.total_games;

        console.log(`Fetching complete league data for user ${telegramId} with ${totalGames} games`);

        // Get complete league data
        const leagueData = await serverLeagueService.getCompleteLeagueData(userId, totalGames);

        console.log(`Successfully fetched league data for user ${telegramId}:`, {
            leagues: leagueData.leagues.length,
            hasProgressInfo: !!leagueData.progressInfo,
            userRewards: leagueData.userRewards.length,
            hasNeighbors: !!leagueData.neighbors,
            leaderboards: Object.keys(leagueData.leaderboards).length
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
                        error: 'User or league data not found'
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes('league')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to fetch league data'
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to retrieve league information'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/leagues
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