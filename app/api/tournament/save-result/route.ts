// src/app/api/tournament/save-result/route.ts - Protected tournament result saving with bot detection

import { NextRequest, NextResponse } from 'next/server';
import { withTournamentProtection } from '@/lib/authMiddleware';
import { tournamentService } from '@/lib/supabase_tournament_extension';
import { GameMode } from '@/types/game-modes';

export const POST = withTournamentProtection(async (request) => {
    try {
        const { user } = request;
        const { tournamentId, gameResult } = await request.json();

        // Validate tournament result
        if (!tournamentId || !gameResult) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing tournament ID or game result',
                },
                { status: 400 }
            );
        }

        // Validate survival game result for tournament
        if (gameResult.mode !== GameMode.SURVIVAL) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Only survival mode results allowed for tournaments',
                },
                { status: 400 }
            );
        }

        // Validate game result data
        if (typeof gameResult.survivalTime !== 'number' || gameResult.survivalTime < 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid survival time',
                },
                { status: 400 }
            );
        }

        if (typeof gameResult.score !== 'number' || gameResult.score < 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid score',
                },
                { status: 400 }
            );
        }

        if (typeof gameResult.maxLevelReached !== 'number' || gameResult.maxLevelReached < 1) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid max level reached',
                },
                { status: 400 }
            );
        }

        // Save tournament result
        const tournamentResult = await tournamentService.saveTournamentResult(
            tournamentId,
            user.userId,
            user.telegramId,
            {
                survivalTime: gameResult.survivalTime,
                score: gameResult.score,
                maxLevelReached: gameResult.maxLevelReached,
                perfectStreak: gameResult.perfectStreak,
                correctHits: gameResult.correctHits,
                deathCause: gameResult.deathCause,
            }
        );

        return NextResponse.json({
            success: true,
            tournamentResult,
        });
    } catch (error) {
        console.error('Error saving tournament result:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to save tournament result',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
});