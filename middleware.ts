// src/middleware.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ с защитой от будущих auth_date

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

// 🚨 НОВАЯ ФУНКЦИЯ: Rate limiting для защиты от атак
const authAttempts = new Map<string, { count: number, lastAttempt: number, blockedUntil?: number }>();

function checkRateLimit(ip: string): { allowed: boolean, resetTime?: number } {
  const now = Date.now();
  const key = ip;
  const current = authAttempts.get(key);
  
  if (!current) {
    authAttempts.set(key, { count: 1, lastAttempt: now });
    return { allowed: true };
  }
  
  // Проверка блокировки
  if (current.blockedUntil && now < current.blockedUntil) {
    return { allowed: false, resetTime: current.blockedUntil };
  }
  
  // Сброс каждые 15 минут
  if (now - current.lastAttempt > 15 * 60 * 1000) {
    authAttempts.set(key, { count: 1, lastAttempt: now });
    return { allowed: true };
  }
  
  current.count++;
  current.lastAttempt = now;
  
  // Прогрессивная блокировка
  if (current.count > 20) {
    // Блокировка на 1 час
    current.blockedUntil = now + 60 * 60 * 1000;
    console.error(`[MIDDLEWARE] IP ${ip} blocked for 1 hour after ${current.count} attempts`);
    return { allowed: false, resetTime: current.blockedUntil };
  } else if (current.count > 10) {
    // Предупреждение
    console.warn(`[MIDDLEWARE] IP ${ip} approaching limit: ${current.count} attempts`);
  }
  
  return { allowed: true };
}

// 🚨 НОВАЯ ФУНКЦИЯ: Валидация auth_date в middleware
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
    
    // Проверка старых данных (строже чем клиент)
    if (currentTime - authDate > 1800) { // 30 минут максимум
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

// 🚨 НОВАЯ ФУНКЦИЯ: Логирование подозрительной активности
function logSecurityEvent(type: string, data: any, request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || 
            request.headers.get("x-real-ip") || 
            "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    ip,
    userAgent: userAgent.substring(0, 200), // Ограничиваем длину
    url: request.url,
    method: request.method,
    data
  };
  
  console.error(`[SECURITY ALERT] ${type}:`, JSON.stringify(logEntry, null, 2));
  
  // TODO: Можно добавить отправку в внешний сервис мониторинга
  // await sendToSecurityMonitoring(logEntry);
}

/**
 * Главная middleware функция с усиленной защитой
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const ip = request.headers.get("x-forwarded-for") || 
            request.headers.get("x-real-ip") || 
            "unknown";

  console.log(`[Middleware] ${method} ${pathname} from ${ip}`);

  // 1. Обрабатываем OPTIONS (preflight) запросы первыми
  if (method === "OPTIONS") {
    console.log(`[Middleware] Handling OPTIONS preflight for ${pathname}`);
    return handleCorsPreflightRequest(request);
  }

  // 2. 🚨 ЭКСТРЕННАЯ ЗАЩИТА для auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    console.log(`[Middleware] Applying auth endpoint protection for ${pathname}`);
    
    // Rate limiting
    const rateLimitCheck = checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      console.error(`[Middleware] Rate limit exceeded for IP ${ip}`);
      
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { 
        ip, 
        attempts: authAttempts.get(ip)?.count,
        resetTime: rateLimitCheck.resetTime 
      }, request);
      
      const response = NextResponse.json({
        success: false,
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: rateLimitCheck.resetTime ? Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000) : 900
      }, { status: 429 });
      
      return applyCorsHeaders(request, response);
    }
    
    // Проверка размера запроса
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10000) { // 10KB максимум для auth запросов
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
            
            // Логируем различные типы атак
            let alertType = 'AUTH_VALIDATION_FAILED';
            if (authValidation.error?.includes('future')) {
              alertType = 'FUTURE_AUTH_DATE_ATTACK';
            } else if (authValidation.error?.includes('old')) {
              alertType = 'OLD_AUTH_DATE_ATTACK';
            }
            
            logSecurityEvent(alertType, {
              authDate: authValidation.authDate,
              timeDiff: authValidation.timeDiff,
              error: authValidation.error
            }, request);
            
            const response = NextResponse.json({
              success: false,
              error: "Invalid authentication data",
              code: "AUTH_VALIDATION_FAILED",
              blocked: true
            }, { status: 400 });
            
            return applyCorsHeaders(request, response);
          } else {
            console.log(`[Middleware] Auth validation passed, timeDiff: ${authValidation.timeDiff}s`);
          }
          
          // Дополнительные проверки initData
          const urlParams = new URLSearchParams(jsonBody.initData);
          
          // Проверка наличия обязательных полей
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
              
              // Проверка на разумные значения
              if (user.id <= 0 || user.id > 9999999999) {
                console.error(`[Middleware] Suspicious user ID: ${user.id}`);
                
                logSecurityEvent('SUSPICIOUS_USER_ID', { userId: user.id }, request);
                
                const response = NextResponse.json({
                  success: false,
                  error: "Invalid user data",
                  code: "SUSPICIOUS_USER_ID"
                }, { status: 400 });
                
                return applyCorsHeaders(request, response);
              }
              
            } catch (error) {
              console.error("[Middleware] Failed to parse user data:", error);
              
              logSecurityEvent('USER_DATA_PARSE_ERROR', { error: "User data parse error" }, request);
              
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
      
      // Не блокируем на ошибках парсинга JSON, но логируем
      logSecurityEvent('AUTH_REQUEST_PARSE_ERROR', { 
        error: "Auth request parse error"
      }, request);
    }
  }

  // 3. Проверяем, является ли путь публичным
  const isPublic = isPublicPath(pathname);

  // 4. Специальная обработка для CRON задач
  if (pathname.startsWith("/api/cron")) {
    const authHeader = request.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");
    const cronApiKey = process.env.CRON_API_KEY;

    if (!apiKey || !cronApiKey || apiKey !== cronApiKey) {
      console.warn(`[Middleware] Unauthorized CRON access attempt for ${pathname} from ${ip}`);
      
      logSecurityEvent('CRON_AUTH_FAILED', { ip }, request);

      const response = NextResponse.json({
        error: "Unauthorized access",
        code: "CRON_AUTH_FAILED",
      }, { status: 401 });

      return applyCorsHeaders(request, response);
    }

    console.log(`[Middleware] CRON authentication successful for ${pathname}`);
    const response = NextResponse.next();

    return applyCorsHeaders(request, response);
  }

  // 5. Для публичных путей - пропускаем без проверки токена
  if (isPublic) {
    console.log(`[Middleware] Public endpoint accessed: ${pathname}`);
    const response = NextResponse.next();

    return applyCorsHeaders(request, response);
  }

  // 6. Для защищенных путей - проверяем JWT токен
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

    // Логируем подозрительные попытки доступа с неправильными токенами
    if (errorCode === "MALFORMED_TOKEN") {
      logSecurityEvent('MALFORMED_TOKEN_ATTACK', { 
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

// 🚨 ФУНКЦИЯ ОЧИСТКИ: Периодическая очистка rate limit кеша
setInterval(() => {
  const now = Date.now();
  const oldEntries: string[] = [];
  
  authAttempts.forEach((value, key) => {
    // Удаляем записи старше 24 часов
    if (now - value.lastAttempt > 24 * 60 * 60 * 1000) {
      oldEntries.push(key);
    }
  });
  
  oldEntries.forEach(key => authAttempts.delete(key));
  
  if (oldEntries.length > 0) {
    console.log(`[Middleware] Cleaned ${oldEntries.length} old rate limit entries`);
  }
}, 60 * 60 * 1000); // Каждый час