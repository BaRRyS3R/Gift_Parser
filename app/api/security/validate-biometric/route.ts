// src/app/api/security/validate-biometric/route.ts - Biometric validation endpoint

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
    try {
        const telegramId = request.headers.get('x-telegram-id');
        const { success, completedInTime } = await request.json();

        if (!telegramId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User authentication required',
                },
                { status: 401 }
            );
        }

        if (success && completedInTime) {
            // Biometric passed - increase trust score significantly
            const { data, error } = await supabaseServer.rpc('update_trust_score', {
                user_telegram_id: parseInt(telegramId),
                score_change: 30
            });

            if (error) {
                console.error("Error updating trust score:", error.message);
            }

            return NextResponse.json({
                success: true,
                newTrustScore: data || 0,
            });
        } else {
            // Biometric failed - block user and decrease trust score
            await supabaseServer.rpc('update_trust_score', {
                user_telegram_id: parseInt(telegramId),
                score_change: -15
            });

            await supabaseServer.rpc('block_user', {
                user_telegram_id: parseInt(telegramId),
                reason: 'biometric_failed',
                duration_minutes: 5
            });

            return NextResponse.json({
                success: false,
                newTrustScore: 0,
            });
        }
    } catch (error) {
        console.error('Biometric validation API error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to validate biometric',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}