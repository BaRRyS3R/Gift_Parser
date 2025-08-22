// src/app/api/auth/register/route.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ с усиленной безопасностью

import type { TelegramUser } from "@/lib/supabase";

import { NextRequest, NextResponse } from "next/server";

import { serverUserService } from "@/lib/supabase_server";
import {
  validateTelegramData,
  extractReferralCode,
  createInitDataHash,
  quickAuthDateCheck,
} from "@/lib/telegram-auth";
import { createJWT, createRefreshToken } from "@/lib/jwt";

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
    trust_score: number;
    blocked_until?: string;
    current_level: number;
    total_games: number;
    attempts_remaining: number;
    referral_code: string;
    created_at: string;
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

// 🚨 НОВАЯ ФУНКЦИЯ: Логирование событий безопасности
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
    endpoint: "/api/auth/register",
    data
  };
  
  console.error(`[REGISTER SECURITY] ${type}:`, JSON.stringify(logEntry, null, 2));
}

// 🚨 НОВАЯ ФУНКЦИЯ: Мягкая проверка подозрительного поведения (только логирование)
function detectSuspiciousRegistration(telegramUser: TelegramUser, request: NextRequest): {
  isSuspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  // Проверка на очень короткие имена
  if (telegramUser.first_name.length < 1) {
    reasons.push("empty_name");
  }
  
  // Проверка на явно поддельные паттерны
  if (/^(test|fake|bot|spam)/i.test(telegramUser.first_name)) {
    reasons.push("suspicious_name_keywords");
  }
  
  // УБРАЛИ: Проверку на новые аккаунты (может блокировать легитимных новых пользователей)
  // УБРАЛИ: Проверку на отсутствие username (многие легитимные пользователи не имеют username)
  
  return {
    isSuspicious: reasons.length > 0,
    reasons
  };
}

/**
 * POST /api/auth/register
 * Registers a new user with Telegram WebApp data validation
 * 🚨 УСИЛЕННАЯ ВЕРСИЯ с многоуровневой защитой и анти-фрод проверками
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<RegisterResponse>> {
  const startTime = Date.now();
  
  try {
    console.log("[REGISTER] Starting registration process");
    
    // Parse request body
    const body: RegisterRequest = await request.json();
    const { initData, referralCode } = body;

    if (!initData) {
      console.error("[REGISTER] Missing initData parameter");
      logSecurityEvent('MISSING_INIT_DATA', {}, request);
      
      return NextResponse.json({
        success: false,
        error: "Missing initData parameter",
      }, { status: 400 });
    }

    // 🚨 БЫСТРАЯ ПРЕДВАРИТЕЛЬНАЯ ПРОВЕРКА AUTH_DATE
    const quickCheck = quickAuthDateCheck(initData);
    if (!quickCheck.isValid) {
      console.error(`[REGISTER] Quick auth_date check failed: ${quickCheck.error}`);
      logSecurityEvent('QUICK_AUTH_DATE_CHECK_FAILED', {
        error: quickCheck.error,
        authDate: quickCheck.authDate
      }, request);
      
      return NextResponse.json({
        success: false,
        error: "Invalid authentication data",
      }, { status: 400 });
    }

    console.log(`[REGISTER] Quick check passed, auth_date: ${quickCheck.authDate}`);

    // 🚨 ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ БЕЗОПАСНОСТИ
    
    // Проверка размера initData (увеличили лимит для высокой нагрузки)
    if (initData.length > 10000) { // 10KB максимум (увеличили с 5KB)
      console.error(`[REGISTER] InitData too large: ${initData.length} characters`);
      logSecurityEvent('INIT_DATA_TOO_LARGE', { 
        length: initData.length 
      }, request);
      
      return NextResponse.json({
        success: false,
        error: "Invalid request format",
      }, { status: 400 });
    }

    // Проверка формата referralCode если предоставлен
    if (referralCode && !/^[A-Z0-9]{8}$/.test(referralCode)) {
      console.error(`[REGISTER] Invalid referral code format: ${referralCode}`);
      logSecurityEvent('INVALID_REFERRAL_FORMAT', { 
        referralCode 
      }, request);
      
      return NextResponse.json({
        success: false,
        error: "Invalid referral code format",
      }, { status: 400 });
    }

    // Validate Telegram WebApp data with full cryptographic verification
    console.log("[REGISTER] Starting full Telegram data validation");
    const validation = validateTelegramData(initData);

    if (!validation.isValid || !validation.user) {
      console.error(`[REGISTER] Telegram validation failed: ${validation.error}`);
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
    console.log(`[REGISTER] Validation successful for user ${telegramUser.id} (${telegramUser.first_name})`);

    // 🚨 ПРОВЕРКА НА ПОДОЗРИТЕЛЬНУЮ РЕГИСТРАЦИЮ
    const suspiciousCheck = detectSuspiciousRegistration(telegramUser, request);
    if (suspiciousCheck.isSuspicious) {
      console.warn(`[REGISTER] Suspicious registration detected for user ${telegramUser.id}: ${suspiciousCheck.reasons.join(', ')}`);
      logSecurityEvent('SUSPICIOUS_REGISTRATION', {
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name,
        reasons: suspiciousCheck.reasons,
        username: telegramUser.username,
        isPremium: telegramUser.is_premium
      }, request);
      
      // Не блокируем, но логируем для мониторинга
      // В будущем можно добавить дополнительную верификацию для подозрительных регистраций
    }

    // Check if user already exists
    console.log("[REGISTER] Checking if user already exists");
    const existingUser = await serverUserService.findByTelegramId(telegramUser.id);

    if (existingUser) {
      console.log(`[REGISTER] User ${telegramUser.id} already exists`);
      logSecurityEvent('DUPLICATE_REGISTRATION', {
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name,
        existingUserId: existingUser.id
      }, request);
      
      return NextResponse.json({
        success: false,
        error: "User already exists",
      }, { status: 409 });
    }

    // Extract referral code from initData if not provided
    const extractedReferralCode = extractReferralCode(initData);
    const finalReferralCode = referralCode || extractedReferralCode || undefined;

    console.log(`[REGISTER] Final referral code: ${finalReferralCode || 'none'}`);

    // Validate referral code and get referrer info
    let referralBonusInfo:
      | {
          received: number;
          referrerName?: string;
          referrerUsername?: string;
        }
      | undefined;

    if (finalReferralCode) {
      console.log(`[REGISTER] Validating referral code: ${finalReferralCode}`);
      
      const referralValidation = await serverUserService.validateReferralCodeAndGetReferrer(
        finalReferralCode,
      );

      if (referralValidation.isValid) {
        console.log(`[REGISTER] Valid referral code, bonus: ${referralValidation.bonus}`);
        referralBonusInfo = {
          received: referralValidation.bonus,
          referrerName: referralValidation.referrerName,
          referrerUsername: referralValidation.referrerUsername,
        };
        
        logSecurityEvent('REFERRAL_USED', {
          telegramId: telegramUser.id,
          referralCode: finalReferralCode,
          bonus: referralValidation.bonus,
          referrerName: referralValidation.referrerName
        }, request);
      } else {
        console.warn(`[REGISTER] Invalid referral code: ${finalReferralCode}`);
        logSecurityEvent('INVALID_REFERRAL_CODE', {
          telegramId: telegramUser.id,
          referralCode: finalReferralCode
        }, request);
        
        // Не блокируем регистрацию из-за неправильного реферального кода
        // Просто игнорируем его
      }
    }

    // 🚨 ДОПОЛНИТЕЛЬНАЯ АНТИ-ФРОД ПРОВЕРКА
    // Проверяем количество регистраций с одного IP за последний час
    const ip = request.headers.get("x-forwarded-for") || 
              request.headers.get("x-real-ip") || 
              "unknown";
    
    // Здесь можно добавить проверку в Redis или базе данных
    // Пока логируем для мониторинга
    logSecurityEvent('REGISTRATION_ATTEMPT', {
      telegramId: telegramUser.id,
      firstName: telegramUser.first_name,
      ip,
      hasReferral: !!finalReferralCode,
      suspiciousReasons: suspiciousCheck.reasons
    }, request);

    // Create new user
    console.log("[REGISTER] Creating new user in database");
    const newUser = await serverUserService.create(telegramUser, finalReferralCode);

    console.log(`[REGISTER] User created successfully: ${newUser.id}`);

    // Create JWT tokens
    const initDataHash = createInitDataHash(initData);

    console.log("[REGISTER] Creating authentication tokens");
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

    // Prepare user data for response (excluding sensitive fields)
    const userData = {
      id: newUser.id,
      telegram_id: newUser.telegram_id,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      username: newUser.username,
      language_code: newUser.language_code,
      is_premium: newUser.is_premium,

      // Trust and moderation fields
      trust_score: newUser.trust_score,
      blocked_until: newUser.blocked_until,

      current_level: newUser.current_level,
      total_games: newUser.total_games,
      attempts_remaining: newUser.attempts_remaining,
      referral_code: newUser.referral_code,
      created_at: newUser.created_at,
    };

    const processingTime = Date.now() - startTime;
    console.log(`[REGISTER] Registration successful for user ${telegramUser.id} in ${processingTime}ms`);
    
    // Логируем успешную регистрацию
    logSecurityEvent('REGISTRATION_SUCCESS', {
      telegramId: telegramUser.id,
      firstName: telegramUser.first_name,
      userId: newUser.id,
      processingTime,
      trustScore: newUser.trust_score,
      hasReferral: !!referralBonusInfo,
      referralBonus: referralBonusInfo?.received
    }, request);

    return NextResponse.json({
      success: true,
      user: userData,
      tokens: {
        accessToken,
        refreshToken,
      },
      referralBonus: referralBonusInfo,
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Registration error:", error);

    // Логируем ошибку
    logSecurityEvent('REGISTRATION_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime
    }, request);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("duplicate key")) {
        return NextResponse.json({
          success: false,
          error: "User already exists",
        }, { status: 409 });
      }

      if (error.message.includes("referral")) {
        return NextResponse.json({
          success: false,
          error: "Invalid referral code",
        }, { status: 400 });
      }
      
      if (error.message.includes("Invalid") || error.message.includes("validation")) {
        return NextResponse.json({
          success: false,
          error: "Invalid authentication data",
        }, { status: 400 });
      }
      
      if (error.message.includes("Bot token") || error.message.includes("TELEGRAM_BOT_API")) {
        console.error("[REGISTER] Bot token error:", error.message);
        return NextResponse.json({
          success: false,
          error: "Authentication service unavailable",
        }, { status: 503 });
      }
    }

    return NextResponse.json({
      success: false,
      error: "Registration failed. Please try again.",
    }, { status: 500 });
  }
}