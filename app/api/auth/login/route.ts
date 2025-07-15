// src/app/api/auth/login/route.ts - Updated authentication endpoint with server-side security

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, type TelegramUserData } from '@/lib/supabase-server';
import { generateToken, validateTelegramInitData } from '@/lib/jwt';

const ATTEMPTS_CONFIG = {
    BASE_ATTEMPTS: 10,
    RESET_ATTEMPTS: 10,
    RESET_INTERVAL_MS: 2 * 60 * 60 * 1000,
    REFERRAL_BONUS: 5,
} as const;

export async function POST(request: NextRequest) {
    try {
        const { initData, referralCode } = await request.json();

        // Validate Telegram WebApp init data
        if (!validateTelegramInitData(initData)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid Telegram authentication data',
                },
                { status: 400 }
            );
        }

        // Parse Telegram user data
        const params = new URLSearchParams(initData);
        const userData = JSON.parse(params.get('user') || '{}');

        const telegramUser: TelegramUserData = {
            id: userData.id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            username: userData.username,
            language_code: userData.language_code,
            is_premium: userData.is_premium || false,
        };

        // SECURITY: Check if user is blocked before proceeding
        const { data: blockCheckData, error: blockCheckError } = await supabaseServer.rpc('check_and_unblock_user', {
            user_telegram_id: telegramUser.id
        });

        if (blockCheckError) {
            console.error("Error checking user block status:", blockCheckError.message);
        }

        // Check current block status
        const { data: userBlockStatus } = await supabaseServer
            .from('users')
            .select('blocked_until, trust_score')
            .eq('telegram_id', telegramUser.id)
            .single();

        if (userBlockStatus?.blocked_until) {
            const { data: serverTimeData } = await supabaseServer.rpc("get_current_timestamp");
            const serverTime = serverTimeData ? new Date(serverTimeData) : new Date();
            const isBlocked = new Date(userBlockStatus.blocked_until) > serverTime;

            if (isBlocked) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'User is temporarily blocked',
                        isBlocked: true,
                        timeUntilUnblock: new Date(userBlockStatus.blocked_until).getTime() - serverTime.getTime(),
                    },
                    { status: 403 }
                );
            }
        }

        // Check if user exists
        let { data: user, error: findError } = await supabaseServer
            .from('users')
            .select('*')
            .eq('telegram_id', telegramUser.id)
            .single();

        // Create user if doesn't exist
        if (findError?.code === 'PGRST116' || !user) {
            // Handle referral logic
            let additionalAttempts = ATTEMPTS_CONFIG.BASE_ATTEMPTS;
            let referredBy = null;

            if (referralCode) {
                const { data: referrer } = await supabaseServer
                    .from('users')
                    .select('id, referral_bonus, referral_count, attempts_remaining')
                    .eq('referral_code', referralCode)
                    .single();

                if (referrer) {
                    referredBy = referralCode;
                    additionalAttempts += referrer.referral_bonus;

                    // Update referrer's stats
                    await supabaseServer
                        .from('users')
                        .update({
                            referral_count: referrer.referral_count + 1,
                            attempts_remaining: referrer.attempts_remaining + 5,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', referrer.id);
                }
            }

            // Generate unique referral code
            let referralCodeToUse = '';
            let isUnique = false;

            while (!isUnique) {
                const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                referralCodeToUse = '';
                for (let i = 0; i < 8; i++) {
                    referralCodeToUse += characters.charAt(Math.floor(Math.random() * characters.length));
                }

                const { data: existingUser } = await supabaseServer
                    .from('users')
                    .select('id')
                    .eq('referral_code', referralCodeToUse)
                    .single();

                if (!existingUser) {
                    isUnique = true;
                }
            }

            const userData = {
                telegram_id: telegramUser.id,
                first_name: telegramUser.first_name,
                last_name: telegramUser.last_name || null,
                username: telegramUser.username || null,
                language_code: telegramUser.language_code || null,
                is_premium: telegramUser.is_premium || false,
                attempts_remaining: additionalAttempts,
                referral_code: referralCodeToUse,
                referred_by: referredBy,
                referral_bonus: 5,
                referral_count: 0,
                current_level: 1,
                trust_score: telegramUser.is_premium ? 60 : 50, // Initial trust score with premium bonus
            };

            const { data: newUser, error: createError } = await supabaseServer
                .from('users')
                .insert(userData)
                .select()
                .single();

            if (createError) {
                console.error('Error creating user:', createError);
                throw createError;
            }

            user = newUser;

            // Initialize user league (we'll need to create this API endpoint later)
            try {
                await supabaseServer.rpc('initialize_user_league', {
                    user_id: user.id,
                    initial_games: 0
                });
            } catch (leagueError) {
                console.error('Error initializing user league:', leagueError);
                // Continue anyway, league can be initialized later
            }
        }

        if (!user) {
            throw new Error('Failed to create or retrieve user');
        }

        // Generate JWT token
        const token = await generateToken(user.id, telegramUser.id);

        // Return safe user data
        const safeUser = {
            id: user.id,
            telegram_id: user.telegram_id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            current_level: user.current_level,
            attempts_remaining: user.attempts_remaining,
            total_games: user.total_games,
            trust_score: user.trust_score,
            blocked_until: user.blocked_until,
            total_score: user.total_score,
            best_score: user.best_score,
            current_league_id: user.current_league_id,
        };

        return NextResponse.json({
            success: true,
            token,
            user: safeUser,
        });
    } catch (error) {
        console.error('Authentication error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Authentication failed',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}