// src/app/api/security/update-trust-score/route.ts - Trust score update endpoint

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
    try {
        const telegramId = request.headers.get('x-telegram-id');
        const { scoreChange } = await request.json();

        if (!telegramId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User authentication required',
                },
                { status: 401 }
            );
        }

        if (typeof scoreChange !== 'number') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid score change value',
                },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseServer.rpc('update_trust_score', {
            user_telegram_id: parseInt(telegramId),
            score_change: scoreChange
        });

        if (error) {
            console.error("Error updating trust score:", error.message);
            throw error;
        }

        return NextResponse.json({
            success: true,
            newTrustScore: data || 0,
        });
    } catch (error) {
        console.error('Trust score update API error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to update trust score',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}