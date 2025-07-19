// src/app/api/tournament/active/route.ts - Get active tournament

import { NextRequest, NextResponse } from 'next/server';
import { serverTournamentService, type TournamentStatus } from '@/lib/server/tournamentService';

// Response interface
interface ActiveTournamentResponse {
    success: boolean;
    data?: TournamentStatus;
    error?: string;
}

/**
 * GET /api/tournament/active
 * Get currently active tournament with status information
 */
export async function GET(request: NextRequest): Promise<NextResponse<ActiveTournamentResponse>> {
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

        console.log(`Fetching active tournament for user: ${telegramId}`);

        // Get tournament status
        const tournamentStatus = await serverTournamentService.getTournamentStatus();

        console.log('Tournament status retrieved:', {
            isActive: tournamentStatus.isActive,
            hasTournament: !!tournamentStatus.activeTournament,
            tournamentName: tournamentStatus.activeTournament?.name
        });

        return NextResponse.json({
            success: true,
            data: tournamentStatus,
        });

    } catch (error) {
        console.error('Error fetching active tournament:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch active tournament'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/tournament/active
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