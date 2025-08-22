// src/middleware.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ с упрощенной обработкой CRON

import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

import { verifyJWT, extractTokenFromHeader } from "./lib/jwt";
import {
  applyCorsHeaders,
  handleCorsPreflightRequest,
  isPublicPath,
} from "./lib/cors";

// Конфигурация для middleware - покрываем ВСЕ API роуты
export const config = {
  matcher: "/api/:path*",
};

// ✅ ВАРИАНТ 1: Полное исключение CRON из middleware
const CRON_PATHS = [
  "/api/cron/restore-attempts",
  "/api/cron/cleanup-sessions",
  "/api/cron/cleanup-tournaments",
  // Добавьте другие CRON пути здесь
];

// User-Agent'ы от cron-job.org для дополнительной проверки
const CRON_USER_AGENTS = [
  "cron-job.org",
  "CronJob.org",
  "Mozilla/5.0 (compatible; CronJob.org)", 
];

// 🚨 НОВАЯ ФУНКЦИЯ: Только качественная валидация auth_date (без rate limiting)
function validateAuthDateInMiddleware(initData: string): {
  isValid: boolean;
  error?: string;
  authDate?: number;
  timeDiff?: number;
} {
  try {
    const urlParams = new URLSearchParams(initData);
    const authDate = parseInt(urlParams.get("auth_date") || "0");
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (!authDate || authDate <= 0) {
      return {
        isValid: false,
        error: "Missing or invalid auth_date",
        authDate
      };
    }
    
    const timeDiff = authDate - currentTime;
    
    // 🚨 КРИТИЧЕСКАЯ ПРОВЕРКА: Блокировка будущих дат
    if (timeDiff > 60) { // Максимум 1 минута в будущем
      console.error(`[MIDDLEWARE SECURITY] Future auth_date attack detected: ${authDate} vs ${currentTime} (diff: ${timeDiff}s)`);
      return {
        isValid: false,
        error: "Auth date is in the future",
        authDate,
        timeDiff
      };
    }
    
    // Проверка старых данных (более мягкая - 2 часа вместо 30 минут)
    if (currentTime - authDate > 7200) { // 2 часа максимум
      console.warn(`[MIDDLEWARE SECURITY] Old auth_date detected: ${authDate}, age: ${currentTime - authDate} seconds`);
      return {
        isValid: false,
        error: "Auth data is too old",
        authDate,
        timeDiff
      };
    }
    
    return {
      isValid: true,
      authDate,
      timeDiff
    };
  } catch (error) {
    console.error("[MIDDLEWARE] Error parsing auth_date:", error);
    return {
      isValid: false,
      error: "Failed to parse auth_date"
    };
  }
}

// 🚨 УПРОЩЕННАЯ ФУНКЦИЯ: Только логирование без блокировок
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
    url: request.url,
    method: request.method,
    data
  };
  
  // Только логирование для аналитики, БЕЗ алертов и блокировок
  console.log(`[SECURITY LOG] ${type}:`, JSON.stringify(logEntry, null, 2));
}

/**
 * Проверка, является ли запрос CRON запросом
 */
function isCronRequest(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") || "";
  
  // Проверяем точное совпадение пути
  if (CRON_PATHS.includes(pathname)) {
    return true;
  }
  
  // Проверяем префикс /api/cron/
  if (pathname.startsWith("/api/cron/")) {
    return true;
  }
  
  // Дополнительная проверка по User-Agent
  if (CRON_USER_AGENTS.some(agent => userAgent.includes(agent))) {
    console.log(`[Middleware] CRON User-Agent detected: ${userAgent}`);
    return true;
  }
  
  return false;
}

/**
 * Упрощенная middleware функция с полным исключением CRON
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const ip = request.headers.get("x-forwarded-for") || 
            request.headers.get("x-real-ip") || 
            "unknown";

  console.log(`[Middleware] ${method} ${pathname} from ${ip}`);

  // ✅ ПОЛНОЕ ИСКЛЮЧЕНИЕ CRON ЗАПРОСОВ (ВАРИАНТ 1)
  if (isCronRequest(request)) {
    console.log(`🚀 [Middleware] CRON request detected, skipping all middleware checks: ${pathname}`);
    
    // Просто пропускаем без ЛЮБЫХ проверок
    const response = NextResponse.next();
    
    // Добавляем только базовые CORS заголовки
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    
    return response;
  }

  // 1. Обрабатываем OPTIONS (preflight) запросы первыми
  if (method === "OPTIONS") {
    console.log(`[Middleware] Handling OPTIONS preflight for ${pathname}`);
    return handleCorsPreflightRequest(request);
  }

  // 2. 🎯 КАЧЕСТВЕННЫЕ ПРОВЕРКИ для auth endpoints (БЕЗ rate limiting)
  if (pathname.startsWith('/api/auth/')) {
    console.log(`[Middleware] Applying auth endpoint protection for ${pathname}`);
    
    // Проверка размера запроса (защита от DDoS)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 50000) { // Увеличили с 10KB до 50KB
      console.error(`[Middleware] Request too large: ${contentLength} bytes`);
      
      logSecurityEvent('REQUEST_TOO_LARGE', { 
        contentLength: parseInt(contentLength) 
      }, request);
      
      const response = NextResponse.json({
        success: false,
        error: "Request too large",
        code: "REQUEST_TOO_LARGE"
      }, { status: 413 });
      
      return applyCorsHeaders(request, response);
    }
    
    try {
      // Читаем body для проверки initData
      const body = await request.clone().text();
      
      if (body) {
        const jsonBody = JSON.parse(body);
        
        if (jsonBody.initData && typeof jsonBody.initData === 'string') {
          console.log(`[Middleware] Validating initData for ${pathname}`);
          
          const authValidation = validateAuthDateInMiddleware(jsonBody.initData);
          
          if (!authValidation.isValid) {
            console.error(`[Middleware] Auth validation failed: ${authValidation.error}`);
            
            // Логируем для аналитики
            let alertType = 'AUTH_VALIDATION_FAILED';
            if (authValidation.error?.includes('future')) {
              alertType = 'FUTURE_AUTH_DATE_ATTACK';
            } else if (authValidation.error?.includes('old')) {
              alertType = 'OLD_AUTH_DATE_DETECTED'; // Изменили с ATTACK на DETECTED
            }
            
            logSecurityEvent(alertType, {
              authDate: authValidation.authDate,
              timeDiff: authValidation.timeDiff,
              error: authValidation.error
            }, request);
            
            // Блокируем только КРИТИЧЕСКИЕ нарушения (будущие даты)
            if (alertType === 'FUTURE_AUTH_DATE_ATTACK') {
              const response = NextResponse.json({
                success: false,
                error: "Invalid authentication data",
                code: "FUTURE_AUTH_DATE_DETECTED"
              }, { status: 400 });
              
              return applyCorsHeaders(request, response);
            }
            
            // Для старых данных - только логируем, НЕ блокируем
            if (alertType === 'OLD_AUTH_DATE_DETECTED') {
              console.warn(`[Middleware] Old auth data detected but allowing through: ${authValidation.timeDiff}s old`);
              // Продолжаем выполнение, не блокируем
            }
          } else {
            console.log(`[Middleware] Auth validation passed, timeDiff: ${authValidation.timeDiff}s`);
          }
          
          // Проверка наличия обязательных полей
          const urlParams = new URLSearchParams(jsonBody.initData);
          
          const requiredFields = ['auth_date', 'hash'];
          for (const field of requiredFields) {
            if (!urlParams.get(field)) {
              console.error(`[Middleware] Missing required field: ${field}`);
              
              logSecurityEvent('MISSING_REQUIRED_FIELD', { field }, request);
              
              const response = NextResponse.json({
                success: false,
                error: "Invalid request format",
                code: "MISSING_REQUIRED_FIELD"
              }, { status: 400 });
              
              return applyCorsHeaders(request, response);
            }
          }
          
          // Проверка формата user данных
          const userParam = urlParams.get('user');
          if (userParam) {
            try {
              const user = JSON.parse(userParam);
              
              // Базовая проверка user полей
              if (!user.id || !user.first_name) {
                console.error("[Middleware] Invalid user data structure");
                
                logSecurityEvent('INVALID_USER_DATA', { userParam: userParam.substring(0, 100) }, request);
                
                const response = NextResponse.json({
                  success: false,
                  error: "Invalid user data",
                  code: "INVALID_USER_DATA"
                }, { status: 400 });
                
                return applyCorsHeaders(request, response);
              }
              
              // Проверка на явно подозрительные значения (только критические случаи)
              if (user.id <= 0 || user.id > 99999999999) { // Расширили диапазон
                console.error(`[Middleware] Highly suspicious user ID: ${user.id}`);
                
                logSecurityEvent('EXTREMELY_SUSPICIOUS_USER_ID', { userId: user.id }, request);
                
                const response = NextResponse.json({
                  success: false,
                  error: "Invalid user data",
                  code: "SUSPICIOUS_USER_ID"
                }, { status: 400 });
                
                return applyCorsHeaders(request, response);
              }
              
            } catch (error) {
              console.error("[Middleware] Failed to parse user data:", error);
              
              logSecurityEvent('USER_DATA_PARSE_ERROR', { error: "USER DATA PARSE ERROR" }, request);
              
              const response = NextResponse.json({
                success: false,
                error: "Invalid user data format",
                code: "USER_DATA_PARSE_ERROR"
              }, { status: 400 });
              
              return applyCorsHeaders(request, response);
            }
          }
        }
      }
    } catch (error) {
      console.error(`[Middleware] Error processing auth request:`, error);
      
      // Логируем ошибку, но НЕ блокируем запрос
      logSecurityEvent('AUTH_REQUEST_PARSE_ERROR', { 
        error: "AUTH REQUEST PARSE ERROR"
      }, request);
    }
  }

  // 3. Проверяем, является ли путь публичным
  const isPublic = isPublicPath(pathname);

  // 4. Для публичных путей - пропускаем без проверки токена
  if (isPublic) {
    console.log(`[Middleware] Public endpoint accessed: ${pathname}`);
    const response = NextResponse.next();

    return applyCorsHeaders(request, response);
  }

  // 5. Для защищенных путей - проверяем JWT токен
  try {
    const authHeader = request.headers.get("Authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log(`[Middleware] Missing token for protected route: ${pathname}`);

      const response = NextResponse.json({
        error: "Authentication required",
        code: "MISSING_TOKEN",
        message: "No authentication token provided",
      }, { status: 401 });

      return applyCorsHeaders(request, response);
    }

    // Верифицируем JWT токен
    console.log(`[Middleware] Verifying token for: ${pathname}`);
    const payload = await verifyJWT(token);

    // Добавляем данные пользователя в заголовки для API роутов
    const requestHeaders = new Headers(request.headers);

    requestHeaders.set("X-User-ID", payload.userId);
    requestHeaders.set("X-Telegram-ID", payload.telegramId.toString());
    requestHeaders.set("X-Auth-Verified", "true");

    console.log(`[Middleware] Token verified for user: ${payload.userId}`);

    // Создаем ответ с модифицированными заголовками
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Применяем CORS заголовки
    return applyCorsHeaders(request, response);
  } catch (error) {
    console.error(`[Middleware] JWT validation error for ${pathname}:`, error);

    const errorMessage = error instanceof Error ? error.message : "Authentication failed";
    let statusCode = 401;
    let errorCode = "INVALID_TOKEN";

    if (errorMessage.includes("expired")) {
      errorCode = "TOKEN_EXPIRED";
    } else if (errorMessage.includes("malformed")) {
      statusCode = 400;
      errorCode = "MALFORMED_TOKEN";
    }

    // Логируем, но не как атаку (может быть просто устаревший токен)
    if (errorCode === "MALFORMED_TOKEN") {
      logSecurityEvent('MALFORMED_TOKEN_DETECTED', { 
        errorMessage,
        authHeader: request.headers.get("Authorization")?.substring(0, 50) 
      }, request);
    }

    const response = NextResponse.json({
      error: "Authentication failed",
      message: errorMessage,
      code: errorCode,
    }, { status: statusCode });

    return applyCorsHeaders(request, response);
  }
}