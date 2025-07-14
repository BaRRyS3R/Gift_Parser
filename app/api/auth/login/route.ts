// src/app/api/auth/login/route.ts - Authentication endpoint with enhanced validation and security

import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/supabase';
import { generateToken, validateTelegramInitData } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const { initData, referralCode } = await request.json();

        // Validate request data
        if (!initData || typeof initData !== 'string') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request data',
                    message: 'Telegram authentication data is required',
                },
                { status: 400 }
            );
        }

        // Validate Telegram WebApp init data
        if (!validateTelegramInitData(initData)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid Telegram authentication data',
                    message: 'The provided Telegram authentication data is not valid',
                },
                { status: 400 }
            );
        }

        // Parse Telegram user data
        const params = new URLSearchParams(initData);
        const userParam = params.get('user');

        if (!userParam) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing user data',
                    message: 'User information not found in authentication data',
                },
                { status: 400 }
            );
        }

        let userData;
        try {
            userData = JSON.parse(userParam);
        } catch (parseError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid user data format',
                    message: 'User data could not be parsed',
                },
                { status: 400 }
            );
        }

        // Validate required user fields
        if (!userData.id || !userData.first_name) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Incomplete user data',
                    message: 'Required user information is missing',
                },
                { status: 400 }
            );
        }

        const telegramUser = {
            id: userData.id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            username: userData.username,
            language_code: userData.language_code,
            is_premium: userData.is_premium || false,
        };

        // Check if user exists
        let user = await userService.findByTelegramId(telegramUser.id);

        // Create user if doesn't exist
        if (!user) {
            try {
                user = await userService.create(telegramUser, referralCode);
            } catch (createError) {
                console.error('User creation failed:', createError);
                return NextResponse.json(
                    {
                        success: false,
                        error: 'User creation failed',
                        message: 'Could not create user account. Please try again.',
                    },
                    { status: 500 }
                );
            }
        }

        // Generate JWT token
        let token;
        try {
            token = await generateToken(user.id, telegramUser.id);
        } catch (tokenError) {
            console.error('Token generation failed:', tokenError);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication failed',
                    message: 'Could not generate authentication token',
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                current_level: user.current_level,
                attempts_remaining: user.attempts_remaining,
                total_games: user.total_games,
            },
        });
    } catch (error) {
        console.error('Authentication error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Authentication failed',
                message: error instanceof Error ? error.message : 'An unexpected error occurred during authentication',
            },
            { status: 500 }
        );
    }
}