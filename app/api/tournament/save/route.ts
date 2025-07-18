// src/app/api/tournament/save/route.ts - Save tournament game results

import { NextRequest, NextResponse } from 'next/server';
import { serverGameService, type TournamentSaveResponse } from '@/lib/server/gameService';
import type { SurvivalGameResult } from '@/types/game-modes/survival';

// Request interface
interface SaveTournamentRequest {
    tournamentId: string;
    gameResult: SurvivalGameResult;
}

// Response interface
interface SaveTournamentResponse {
    success: boolean;
    data?: TournamentSaveResponse;
    error?: string;
}

/**
 * POST /api/tournament/save
 * Save tournament game result with point accumulation
 */
export async function POST(request: NextRequest): Promise<NextResponse<SaveTournamentResponse>> {
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
        let body: SaveTournamentRequest;
        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request body'
                },
                { status: 400 }
            );
        }

        const { tournamentId, gameResult } = body;

        // Validate tournament ID
        if (!tournamentId || typeof tournamentId !== 'string') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Tournament ID is required'
                },
                { status: 400 }
            );
        }

        // Validate game result
        if (!gameResult || typeof gameResult !== 'object') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Game result is required'
                },
                { status: 400 }
            );
        }

        // Validate required survival game fields
        if (typeof gameResult.score !== 'number' || gameResult.score < 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid score'
                },
                { status: 400 }
            );
        }

        if (typeof gameResult.survivalTime !== 'number' || gameResult.survivalTime < 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid survival time'
                },
                { status: 400 }
            );
        }

        if (typeof gameResult.maxLevelReached !== 'number' || gameResult.maxLevelReached < 1) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid max level reached'
                },
                { status: 400 }
            );
        }

        if (typeof gameResult.correctHits !== 'number' || gameResult.correctHits < 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid correct hits count'
                },
                { status: 400 }
            );
        }

        if (!gameResult.deathCause || !['miss', 'wrong_click', 'decoy_hit', 'timeout'].includes(gameResult.deathCause)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid death cause'
                },
                { status: 400 }
            );
        }

        console.log(`Saving tournament result for user ${telegramIdNumber}:`, {
            tournamentId,
            score: gameResult.score,
            survivalTime: gameResult.survivalTime,
            maxLevel: gameResult.maxLevelReached
        });

        // Save tournament result using server service
        const saveResult = await serverGameService.saveTournamentResult(
            tournamentId,
            telegramIdNumber,
            gameResult
        );

        console.log(`Tournament result saved successfully for user ${telegramIdNumber}:`, {
            gameScore: saveResult.game_score,
            totalScore: saveResult.total_score,
            gamesPlayed: saveResult.games_played
        });

        return NextResponse.json({
            success: true,
            data: saveResult,
        });

    } catch (error) {
        console.error('Error saving tournament result:', error);

        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'User or tournament not found'
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes('tournament')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to save tournament result'
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to save tournament result'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/tournament/save
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