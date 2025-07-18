// src/app/api/auth/register/route.ts - Enhanced registration with league initialization

import { NextRequest, NextResponse } from 'next/server';
import { serverUserService } from '@/lib/supabase_server';
import { validateTelegramData, extractReferralCode, createInitDataHash } from '@/lib/telegram-auth';
import { createJWT, createRefreshToken } from '@/lib/jwt';
import type { TelegramUser } from '@/lib/supabase';

// Request body interface
interface RegisterRequest {
  initData: string;
  referralCode?: string;
}

// Response interface
interface RegisterResponse {
  success: boolean;
  user?: {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium: boolean;
    current_level: number;
    current_league_id?: number;
    total_games: number;
    total_score: number;
    best_score: number;
    attempts_remaining: number;
    last_attempt_at?: string;
    attempts_reset_at?: string;
    referral_code: string;
    referral_count: number;
    created_at: string;
    updated_at: string;
    last_played_at?: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  referralBonus?: {
    received: number;
    referrerName?: string;
    referrerUsername?: string;
  };
  error?: string;
}

/**
 * Initialize user league via server league service
 */
async function initializeUserLeague(userId: string): Promise<void> {
  try {
    const { serverLeagueService } = await import('@/lib/server/leagueService');
    await serverLeagueService.initializeUserLeague(userId, 0);
    console.log(`League initialized successfully for new user: ${userId}`);
  } catch (error) {
    console.error('Error initializing league for new user:', error);
    // Non-blocking error - registration should still succeed
    // The user can initialize their league later through the API
  }
}

/**
 * POST /api/auth/register
 * Registers new user with comprehensive validation and league initialization
 */
export async function POST(request: NextRequest): Promise<NextResponse<RegisterResponse>> {
  try {
    // Parse and validate request body
    const body: RegisterRequest = await request.json();
    const { initData, referralCode } = body;

    if (!initData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing initData parameter'
        },
        { status: 400 }
      );
    }

    // Validate Telegram WebApp data with strict security checks
    const validation = validateTelegramData(initData);

    if (!validation.isValid || !validation.user) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Invalid Telegram authentication data'
        },
        { status: 400 }
      );
    }

    const telegramUser: TelegramUser = validation.user;

    // Check for existing user registration
    const existingUser = await serverUserService.findByTelegramId(telegramUser.id);

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'User account already exists. Please use the login endpoint instead.'
        },
        { status: 409 }
      );
    }

    // Process referral code from multiple sources
    const finalReferralCode = referralCode || extractReferralCode(initData);

    // Validate referral code and calculate bonus
    let referralBonus: RegisterResponse['referralBonus'];
    if (finalReferralCode) {
      const referralValidation = await serverUserService.validateReferralCodeAndGetReferrer(finalReferralCode);
      if (referralValidation.isValid) {
        referralBonus = {
          received: referralValidation.bonus,
          referrerName: referralValidation.referrerName,
          referrerUsername: referralValidation.referrerUsername,
        };
        console.log(`Valid referral code provided: ${finalReferralCode} from ${referralValidation.referrerName}`);
      } else {
        console.warn(`Invalid referral code provided: ${finalReferralCode}`);
      }
    }

    // Create new user account with properly typed referral code
    const newUser = await serverUserService.create(telegramUser, finalReferralCode || undefined);

    console.log(`User account created successfully: ${newUser.telegram_id} (${newUser.first_name})`);

    // Initialize user league asynchronously with error handling
    initializeUserLeague(newUser.id).catch(error => {
      console.error('League initialization failed during registration (non-blocking):', error);
      // This error is logged but does not prevent successful registration
      // The user can initialize their league later through the /api/user/initialize-league endpoint
    });

    // Generate secure JWT tokens
    const initDataHash = createInitDataHash(initData);

    const accessToken = await createJWT({
      userId: newUser.id,
      telegramId: newUser.telegram_id,
      telegramData: {
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        username: newUser.username,
        language_code: newUser.language_code,
        is_premium: newUser.is_premium,
      },
      initDataHash,
    });

    const refreshToken = await createRefreshToken({
      userId: newUser.id,
      telegramId: newUser.telegram_id,
      telegramData: {
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        username: newUser.username,
        language_code: newUser.language_code,
        is_premium: newUser.is_premium,
      },
    });

    // Prepare sanitized user data for response
    const userData = {
      id: newUser.id,
      telegram_id: newUser.telegram_id,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      username: newUser.username,
      language_code: newUser.language_code,
      is_premium: newUser.is_premium,
      current_level: newUser.current_level,
      current_league_id: newUser.current_league_id,
      total_games: newUser.total_games,
      total_score: newUser.total_score,
      best_score: newUser.best_score,
      attempts_remaining: newUser.attempts_remaining,
      last_attempt_at: newUser.last_attempt_at,
      attempts_reset_at: newUser.attempts_reset_at,
      referral_code: newUser.referral_code,
      referral_count: newUser.referral_count,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
      last_played_at: newUser.last_played_at,
    };

    // Log successful registration with referral information
    if (referralBonus) {
      console.log(`Registration completed with referral bonus: +${referralBonus.received} attempts from ${referralBonus.referrerName}`);
    }

    return NextResponse.json({
      success: true,
      user: userData,
      tokens: {
        accessToken,
        refreshToken,
      },
      referralBonus,
    });

  } catch (error) {
    console.error('User registration error:', error);

    // Handle specific error conditions with appropriate responses
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          {
            success: false,
            error: 'User account already exists'
          },
          { status: 409 }
        );
      }

      if (error.message.includes('Invalid') || error.message.includes('validation')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid registration data provided'
          },
          { status: 400 }
        );
      }

      if (error.message.includes('referral')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid referral code provided'
          },
          { status: 400 }
        );
      }

      if (error.message.includes('JWT') || error.message.includes('token')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication token generation failed'
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Registration process failed. Please try again.'
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/auth/register
 * Handle CORS preflight requests for registration endpoint
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