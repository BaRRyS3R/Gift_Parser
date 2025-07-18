// src/app/api/user/initialize-league/route.ts - Initialize user league endpoint

import { NextRequest, NextResponse } from 'next/server';
import { serverLeagueService } from '@/lib/server/leagueService';
import { serverUserService } from '@/lib/supabase_server';

// Response interface
interface InitializeLeagueResponse {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * POST /api/user/initialize-league
 * Initialize league for a new user
 */
export async function POST(request: NextRequest): Promise<NextResponse<InitializeLeagueResponse>> {
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

        // Get user data to determine total games
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

        console.log(`Initializing league for user ${telegramIdNumber} with ${user.total_games} games`);

        // Initialize user league using server service
        await serverLeagueService.initializeUserLeague(userId, user.total_games);

        console.log(`League initialized successfully for user ${telegramIdNumber}`);

        return NextResponse.json({
            success: true,
            message: 'League initialized successfully'
        });

    } catch (error) {
        console.error('Error initializing user league:', error);

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

            if (error.message.includes('already exists')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'League already initialized'
                    },
                    { status: 409 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to initialize league'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/user/initialize-league
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