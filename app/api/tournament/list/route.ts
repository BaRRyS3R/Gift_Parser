// src/app/api/tournament/list/route.ts - Get all tournaments

import { NextRequest, NextResponse } from 'next/server';
import { serverTournamentService, type TournamentListResponse } from '@/lib/server/tournamentService';

// Response interface
interface TournamentListAPIResponse {
    success: boolean;
    data?: TournamentListResponse;
    error?: string;
}

/**
 * GET /api/tournament/list
 * Get all tournaments categorized by status (active, upcoming, completed)
 */
export async function GET(request: NextRequest): Promise<NextResponse<TournamentListAPIResponse>> {
    try {
        // Extract user info from middleware headers (for authentication)
        const telegramId = request.headers.get('X-Telegram-ID');
        const userId = request.headers.get('X-User-ID');

        if (!telegramId || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required'
                },
                { status: 401 }
            );
        }

        console.log(`Fetching tournament list for user: ${telegramId}`);

        // Get all tournaments with categorization
        const tournaments = await serverTournamentService.getAllTournaments();

        console.log('Tournament list retrieved:', {
            active: tournaments.active.length,
            upcoming: tournaments.upcoming.length,
            completed: tournaments.completed.length
        });

        return NextResponse.json({
            success: true,
            data: tournaments,
        });

    } catch (error) {
        console.error('Error fetching tournament list:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch tournament list'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/tournament/list
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