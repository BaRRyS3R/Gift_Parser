// src/app/api/auth/login/route.ts - Updated with bonus_restore_attempts field

import type { TelegramUser } from "@/lib/supabase";

import { NextRequest, NextResponse } from "next/server";

import { serverUserService } from "@/lib/supabase_server";
import { serverBlockService } from "@/lib/server/blockService";
import { 
  validateTelegramData, 
  createInitDataHash,
  quickAuthDateCheck 
} from "@/lib/telegram-auth";
import { createJWT, createRefreshToken } from "@/lib/jwt";

// Request body interface
interface LoginRequest {
  initData: string;
}

// Response interface with Nebula integration - Updated with bonus_restore_attempts
interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium: boolean;
    trust_score: number;
    blocked_until?: string;
    current_level: number;
    current_league_id?: number;
    total_games: number;
    total_score: number;
    best_score: number;
    attempts_remaining: number;
    last_attempt_at?: string;
    attempts_reset_at?: string;
    bonus_restore_attempts: number; // NEW: Include bonus restore attempts
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
  // Nebula security fields
  security?: {
    blocked: boolean;
    verificationRequired: boolean;
    verificationType?: "captcha" | "biometric" | "gyroscope";
    trustScore: number;
    blockInfo?: any;
  };
  error?: string;
}

// Функция логирования событий безопасности
function logSecurityEvent(type: string, data: any, request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || 
            request.headers.get("x-real-ip") || 
            "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    ip,
    userAgent: userAgent.substring(0, 200),
    endpoint: "/api/auth/login",
    data
  };
  
  console.error(`[LOGIN SECURITY] ${type}:`, JSON.stringify(logEntry, null, 2));
}

/**
 * POST /api/auth/login
 * Authenticates existing user with Telegram WebApp data validation and Nebula security checks
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<LoginResponse>> {
  const startTime = Date.now();
  
  try {
    console.log("[LOGIN] Starting login process");
    
    // Parse request body
    const body: LoginRequest = await request.json();
    const { initData } = body;

    if (!initData) {
      console.error("[LOGIN] Missing initData parameter");
      logSecurityEvent('MISSING_INIT_DATA', {}, request);
      
      return NextResponse.json({
        success: false,
        error: "Missing initData parameter",
      }, { status: 400 });
    }

    // Быстрая предварительная проверка AUTH_DATE
    const quickCheck = quickAuthDateCheck(initData);
    if (!quickCheck.isValid) {
      console.error(`[LOGIN] Quick auth_date check failed: ${quickCheck.error}`);
      logSecurityEvent('QUICK_AUTH_DATE_CHECK_FAILED', {
        error: quickCheck.error,
        authDate: quickCheck.authDate
      }, request);
      
      return NextResponse.json({
        success: false,
        error: "Invalid authentication data",
      }, { status: 400 });
    }

    console.log(`[LOGIN] Quick check passed, auth_date: ${quickCheck.authDate}`);

    // Дополнительные проверки безопасности
    
    // Проверка размера initData
    if (initData.length > 10000) { // 10KB максимум
      console.error(`[LOGIN] InitData too large: ${initData.length} characters`);
      logSecurityEvent('INIT_DATA_TOO_LARGE', { 
        length: initData.length 
      }, request);
      
      return NextResponse.json({
        success: false,
        error: "Invalid request format",
      }, { status: 400 });
    }

    // Проверка на подозрительные символы в initData
    if (!/^[a-zA-Z0-9=&%\-_{}:"',\s\/.\\]+$/.test(initData)) {
      console.error("[LOGIN] Suspicious characters in initData");
      logSecurityEvent('SUSPICIOUS_CHARACTERS', {
        sample: initData.substring(0, 100)
      }, request);
      
      return NextResponse.json({
        success: false,
        error: "Invalid request format",
      }, { status: 400 });
    }

    // Validate Telegram WebApp data with full cryptographic verification
    console.log("[LOGIN] Starting full Telegram data validation");
    const validation = validateTelegramData(initData);

    if (!validation.isValid || !validation.user) {
      console.error(`[LOGIN] Telegram validation failed: ${validation.error}`);
      logSecurityEvent('TELEGRAM_VALIDATION_FAILED', {
        error: validation.error,
        hasUser: !!validation.user
      }, request);
      
      return NextResponse.json({
        success: false,
        error: validation.error || "Invalid Telegram data",
      }, { status: 400 });
    }

    const telegramUser: TelegramUser = validation.user;
    console.log(`[LOGIN] Validation successful for user ${telegramUser.id} (${telegramUser.first_name})`);

    // Find existing user
    console.log("[LOGIN] Looking up existing user in database");
    const existingUser = await serverUserService.findByTelegramId(telegramUser.id);

    if (!existingUser) {
      console.log(`[LOGIN] User ${telegramUser.id} not found in database`);
      logSecurityEvent('USER_NOT_FOUND', {
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name
      }, request);
      
      return NextResponse.json({
        success: false,
        error: "User not found. Please register first.",
      }, { status: 404 });
    }

    console.log(`[LOGIN] Found existing user: ${existingUser.id}`);

    // Дополнительная проверка: Сравнение данных пользователя
    if (existingUser.first_name !== telegramUser.first_name) {
      console.warn(`[LOGIN] First name mismatch for user ${telegramUser.id}: DB="${existingUser.first_name}" vs Telegram="${telegramUser.first_name}"`);
      // Не блокируем, так как пользователь мог изменить имя, но логируем
    }

    // Update user data from Telegram (in case profile changed)
    console.log("[LOGIN] Updating user data from Telegram");
    const updatedUser = await serverUserService.updateUser(telegramUser.id, {
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username,
      language_code: telegramUser.language_code,
      is_premium: telegramUser.is_premium,
      updated_at: new Date().toISOString(),
    });

    // NEBULA SECURITY CHECKS
    console.log("[LOGIN] Starting Nebula security checks");
    
    // Step 1: Check if user is currently blocked
    const blockInfo = await serverBlockService.checkUserBlock(updatedUser.telegram_id);

    if (blockInfo && blockInfo.isActive && blockInfo.timeRemainingSeconds > 0) {
      console.log(`[LOGIN] User ${telegramUser.id} is currently blocked`);
      logSecurityEvent('USER_BLOCKED', {
        telegramId: telegramUser.id,
        blockInfo
      }, request);
      
      // Create limited tokens for accessing block status page
      const initDataHash = createInitDataHash(initData);
      const accessToken = await createJWT({
        userId: updatedUser.id,
        telegramId: updatedUser.telegram_id,
        telegramData: {
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          username: updatedUser.username,
          language_code: updatedUser.language_code,
          is_premium: updatedUser.is_premium,
        },
        initDataHash,
      });

      const refreshToken = await createRefreshToken({
        userId: updatedUser.id,
        telegramId: updatedUser.telegram_id,
        telegramData: {
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          username: updatedUser.username,
          language_code: updatedUser.language_code,
          is_premium: updatedUser.is_premium,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          telegram_id: updatedUser.telegram_id,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          username: updatedUser.username,
          language_code: updatedUser.language_code,
          is_premium: updatedUser.is_premium,
          trust_score: updatedUser.trust_score,
          blocked_until: updatedUser.blocked_until,
          current_level: updatedUser.current_level,
          current_league_id: updatedUser.current_league_id,
          total_games: updatedUser.total_games,
          total_score: updatedUser.total_score,
          best_score: updatedUser.best_score,
          attempts_remaining: updatedUser.attempts_remaining,
          last_attempt_at: updatedUser.last_attempt_at,
          attempts_reset_at: updatedUser.attempts_reset_at,
          bonus_restore_attempts: updatedUser.bonus_restore_attempts, // NEW: Include bonus restore attempts
          referral_code: updatedUser.referral_code,
          referral_count: updatedUser.referral_count,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at,
          last_played_at: updatedUser.last_played_at,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
        security: {
          blocked: true,
          verificationRequired: false,
          trustScore: updatedUser.trust_score,
          blockInfo,
        },
      });
    }

    // Step 2: Check if user requires verification based on trust score
    console.log("[LOGIN] Checking verification requirements");
    const verificationReq = await serverBlockService.checkVerificationRequirement(
      updatedUser.telegram_id,
    );

    if (verificationReq.required && verificationReq.type) {
      console.log(`[LOGIN] User ${telegramUser.id} requires verification: ${verificationReq.type}`);
      logSecurityEvent('VERIFICATION_REQUIRED', {
        telegramId: telegramUser.id,
        verificationType: verificationReq.type,
        trustScore: verificationReq.trustScore
      }, request);
      
      // Create limited tokens for accessing verification page
      const initDataHash = createInitDataHash(initData);
      const accessToken = await createJWT({
        userId: updatedUser.id,
        telegramId: updatedUser.telegram_id,
        telegramData: {
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          username: updatedUser.username,
          language_code: updatedUser.language_code,
          is_premium: updatedUser.is_premium,
        },
        initDataHash,
      });

      const refreshToken = await createRefreshToken({
        userId: updatedUser.id,
        telegramId: updatedUser.telegram_id,
        telegramData: {
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          username: updatedUser.username,
          language_code: updatedUser.language_code,
          is_premium: updatedUser.is_premium,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          telegram_id: updatedUser.telegram_id,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          username: updatedUser.username,
          language_code: updatedUser.language_code,
          is_premium: updatedUser.is_premium,
          trust_score: updatedUser.trust_score,
          blocked_until: updatedUser.blocked_until,
          current_level: updatedUser.current_level,
          current_league_id: updatedUser.current_league_id,
          total_games: updatedUser.total_games,
          total_score: updatedUser.total_score,
          best_score: updatedUser.best_score,
          attempts_remaining: updatedUser.attempts_remaining,
          last_attempt_at: updatedUser.last_attempt_at,
          attempts_reset_at: updatedUser.attempts_reset_at,
          bonus_restore_attempts: updatedUser.bonus_restore_attempts, // NEW: Include bonus restore attempts
          referral_code: updatedUser.referral_code,
          referral_count: updatedUser.referral_count,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at,
          last_played_at: updatedUser.last_played_at,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
        security: {
          blocked: false,
          verificationRequired: true,
          verificationType: verificationReq.type,
          trustScore: verificationReq.trustScore,
        },
      });
    }

    // Create full access JWT tokens
    console.log("[LOGIN] Creating full access tokens");
    const initDataHash = createInitDataHash(initData);

    const accessToken = await createJWT({
      userId: updatedUser.id,
      telegramId: updatedUser.telegram_id,
      telegramData: {
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        username: updatedUser.username,
        language_code: updatedUser.language_code,
        is_premium: updatedUser.is_premium,
      },
      initDataHash,
    });

    const refreshToken = await createRefreshToken({
      userId: updatedUser.id,
      telegramId: updatedUser.telegram_id,
      telegramData: {
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        username: updatedUser.username,
        language_code: updatedUser.language_code,
        is_premium: updatedUser.is_premium,
      },
    });

    // Prepare user data for response (excluding sensitive fields) - Updated with bonus_restore_attempts
    const userData = {
      id: updatedUser.id,
      telegram_id: updatedUser.telegram_id,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      username: updatedUser.username,
      language_code: updatedUser.language_code,
      is_premium: updatedUser.is_premium,
      trust_score: updatedUser.trust_score,
      blocked_until: updatedUser.blocked_until,
      current_level: updatedUser.current_level,
      current_league_id: updatedUser.current_league_id,
      total_games: updatedUser.total_games,
      total_score: updatedUser.total_score,
      best_score: updatedUser.best_score,
      attempts_remaining: updatedUser.attempts_remaining,
      last_attempt_at: updatedUser.last_attempt_at,
      attempts_reset_at: updatedUser.attempts_reset_at,
      bonus_restore_attempts: updatedUser.bonus_restore_attempts, // NEW: Include bonus restore attempts
      referral_code: updatedUser.referral_code,
      referral_count: updatedUser.referral_count,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
      last_played_at: updatedUser.last_played_at,
    };

    const processingTime = Date.now() - startTime;
    console.log(`[LOGIN] Login successful for user ${telegramUser.id} in ${processingTime}ms`);
    
    // Логируем успешный вход
    logSecurityEvent('LOGIN_SUCCESS', {
      telegramId: telegramUser.id,
      firstName: telegramUser.first_name,
      processingTime,
      trustScore: updatedUser.trust_score
    }, request);

    return NextResponse.json({
      success: true,
      user: userData,
      tokens: {
        accessToken,
        refreshToken,
      },
      security: {
        blocked: false,
        verificationRequired: false,
        trustScore: verificationReq.trustScore,
      },
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Login error:", error);

    // Логируем ошибку
    logSecurityEvent('LOGIN_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime
    }, request);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({
          success: false,
          error: "User not found",
        }, { status: 404 });
      }

      if (error.message.includes("Invalid") || error.message.includes("validation")) {
        return NextResponse.json({
          success: false,
          error: "Invalid authentication data",
        }, { status: 400 });
      }
      
      if (error.message.includes("Bot token") || error.message.includes("TELEGRAM_BOT_API")) {
        // Серверная ошибка, не раскрываем детали
        console.error("[LOGIN] Bot token error:", error.message);
        return NextResponse.json({
          success: false,
          error: "Authentication service unavailable",
        }, { status: 503 });
      }
    }

    return NextResponse.json({
      success: false,
      error: "Authentication failed. Please try again.",
    }, { status: 500 });
  }
}