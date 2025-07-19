// src/app/api/referral/validate/route.ts - ПРОСТАЯ версия

import { NextRequest, NextResponse } from 'next/server';
import { serverUserService } from '@/lib/supabase_server';

interface ValidateReferralRequest {
    referralCode: string;
}

interface ValidateReferralResponse {
    success: boolean;
    isValid: boolean;
    referralCode?: string;
    bonus?: number;
    referrerName?: string;
    referrerUsername?: string;
    error?: string;
}

/**
 * POST /api/referral/validate
 * ✅ Просто вызывает существующую функцию serverUserService.validateReferralCodeAndGetReferrer
 */
export async function POST(request: NextRequest): Promise<NextResponse<ValidateReferralResponse>> {
    try {
        const body: ValidateReferralRequest = await request.json();
        const { referralCode } = body;

        if (!referralCode) {
            return NextResponse.json({
                success: false,
                isValid: false,
                error: 'Missing referral code'
            });
        }

        // ✅ ИСПОЛЬЗУЕМ УЖЕ СУЩЕСТВУЮЩУЮ ФУНКЦИЮ!
        const validation = await serverUserService.validateReferralCodeAndGetReferrer(referralCode);

        return NextResponse.json({
            success: true,
            isValid: validation.isValid,
            referralCode: validation.isValid ? referralCode : undefined,
            bonus: validation.bonus,
            referrerName: validation.referrerName,
            referrerUsername: validation.referrerUsername,
            error: validation.isValid ? undefined : 'Referral code not found'
        });

    } catch (error) {
        console.error('Referral validation error:', error);
        return NextResponse.json({
            success: false,
            isValid: false,
            error: 'Failed to validate referral code'
        }, { status: 500 });
    }
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}