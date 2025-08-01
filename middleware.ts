// src/middleware.ts - Оптимизированный middleware с быстрой обработкой API попыток

import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

import { verifyJWT, extractTokenFromHeader } from "./lib/jwt";

// Упрощенная конфигурация matcher для избежания конфликтов
export const config = {
  matcher: [
    // Только защищенные API маршруты, исключая auth маршруты
    "/api/user/:path*",
    "/api/game/:path*",
    "/api/tournament/:path*",
    "/api/leagues/:path*",
    "/api/tasks/:path*",
    "/api/purchase/:path*",
    "/api/referral/:path*",
    "/api/leaderboard/:path*",
    "/api/check-telegram-membership",
    "/api/nebula/:path*",
    "/api/seasons/:path*",
    "/api/easter-egg/:path*",
  ],
};

// Публичные эндпоинты, не требующие аутентификации
const PUBLIC_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/health",
  "/api/status",
];

// Админские эндпоинты, требующие специальных разрешений
const ADMIN_ENDPOINTS = [
  "/api/admin/",
  "/api/tournament/create",
  "/api/tournament/manage",
];

// Критичные по времени эндпоинты попыток для быстрой обработки
const ATTEMPTS_ENDPOINTS = [
  "/api/user/attempts/status",
  "/api/user/attempts/consume",
];

/**
 * Обработка CORS preflight запросов
 */
function handleCORSPreflight(request: NextRequest): NextResponse | null {
  if (request.method !== "OPTIONS") {
    return null;
  }

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_ALLOWED_ORIGIN,
    "https://web.telegram.org",
    "https://notfren.com",
    "https://telegram.org",
    "http://localhost:3000", // Для разработки
  ].filter(Boolean);

  const origin = request.headers.get("origin");

  const response = new NextResponse(null, { status: 200 });

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // Разрешаем same-origin запросы без origin заголовка
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Requested-With, X-Fast-Check",
  );
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

/**
 * Добавление CORS заголовков к ответу
 */
function addCORSHeaders(response: NextResponse, request: NextRequest): void {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_ALLOWED_ORIGIN,
    "https://web.telegram.org",
    "https://notfren.com",
    "https://telegram.org",
    "http://localhost:3000", // Для разработки
  ].filter(Boolean);

  const origin = request.headers.get("origin");

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // Разрешаем same-origin запросы без origin заголовка
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Requested-With, X-Fast-Check",
  );
}

/**
 * Быстрая JWT валидация только для извлечения user ID (для критичных по времени эндпоинтов)
 */
async function fastJWTValidation(token: string): Promise<{
  userId: string;
  telegramId: string;
}> {
  try {
    const payload = await verifyJWT(token);
    return {
      userId: payload.userId,
      telegramId: payload.telegramId.toString(),
    };
  } catch (error) {
    throw new Error("Неверный токен");
  }
}

/**
 * Middleware функция для валидации JWT токенов на защищенных маршрутах
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] ${request.method} ${pathname}`);

  // Сначала обрабатываем CORS preflight запросы
  const corsResponse = handleCORSPreflight(request);

  if (corsResponse) {
    console.log(`[Middleware] CORS preflight обработан для ${pathname}`);
    return corsResponse;
  }

  // ВАЖНО: Auth эндпоинты не должны обрабатываться этим middleware
  // благодаря конфигурации matcher, но добавляем эту проверку как защитную сеть
  const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
    pathname.startsWith(endpoint),
  );

  if (isPublicEndpoint) {
    console.log(`[Middleware] Публичный эндпоинт пропущен: ${pathname}`);
    const response = NextResponse.next();
    addCORSHeaders(response, request);
    return response;
  }

  try {
    // Извлекаем токен из Authorization заголовка
    const authHeader = request.headers.get("Authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log(
        `[Middleware] Отсутствует токен для защищенного маршрута: ${pathname}`,
      );
      const response = NextResponse.json(
        {
          error: "Требуется аутентификация",
          code: "MISSING_TOKEN",
          message: "Не предоставлен токен аутентификации",
        },
        { status: 401 },
      );

      addCORSHeaders(response, request);
      return response;
    }

    // Определяем, нужна ли быстрая обработка для эндпоинтов попыток
    const isAttemptsEndpoint = ATTEMPTS_ENDPOINTS.some((endpoint) =>
      pathname.startsWith(endpoint),
    );

    if (isAttemptsEndpoint) {
      console.log(`[Middleware] Быстрая обработка для эндпоинта попыток: ${pathname}`);
      
      // Быстрая валидация только для извлечения user ID
      const { userId, telegramId } = await fastJWTValidation(token);
      
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("X-User-ID", userId);
      requestHeaders.set("X-Telegram-ID", telegramId);
      requestHeaders.set("X-Auth-Verified", "true");

      console.log(`[Middleware] Быстрая валидация токена для пользователя: ${userId}`);

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      addCORSHeaders(response, request);
      return response;
    }

    // Полная верификация JWT токена для всех остальных эндпоинтов
    console.log(`[Middleware] Полная верификация токена для: ${pathname}`);
    const payload = await verifyJWT(token);

    // Проверка для админских эндпоинтов
    if (ADMIN_ENDPOINTS.some((endpoint) => pathname.startsWith(endpoint))) {
      console.log(
        `[Middleware] Доступ к админскому эндпоинту пользователем: ${payload.userId}`,
      );
      // Будущее: Добавить валидацию роли администратора здесь
    }

    // Добавляем данные пользователя в заголовки запроса для API маршрутов
    const requestHeaders = new Headers(request.headers);

    requestHeaders.set("X-User-ID", payload.userId);
    requestHeaders.set("X-Telegram-ID", payload.telegramId.toString());
    requestHeaders.set("X-Auth-Verified", "true");

    console.log(`[Middleware] Токен верифицирован для пользователя: ${payload.userId}`);

    // Создаем ответ с модифицированными заголовками
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    addCORSHeaders(response, request);

    return response;
  } catch (error) {
    console.error(`[Middleware] Ошибка валидации JWT для ${pathname}:`, error);

    // Определяем тип ошибки и возвращаем соответствующий ответ
    const errorMessage =
      error instanceof Error ? error.message : "Аутентификация не удалась";

    let statusCode = 401;
    let errorCode = "INVALID_TOKEN";

    if (errorMessage.includes("истек") || errorMessage.includes("expired")) {
      statusCode = 401;
      errorCode = "TOKEN_EXPIRED";
    } else if (errorMessage.includes("неверный") || errorMessage.includes("malformed")) {
      statusCode = 400;
      errorCode = "MALFORMED_TOKEN";
    }

    const response = NextResponse.json(
      {
        error: "Аутентификация не удалась",
        message: errorMessage,
        code: errorCode,
      },
      { status: statusCode },
    );

    addCORSHeaders(response, request);

    return response;
  }
}