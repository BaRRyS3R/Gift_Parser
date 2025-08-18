// src/middleware.ts - Updated middleware with centralized CORS

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

/**
 * Главная middleware функция
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  console.log(`[Middleware] ${method} ${pathname}`);

  // 1. Обрабатываем OPTIONS (preflight) запросы первыми
  if (method === "OPTIONS") {
    console.log(`[Middleware] Handling OPTIONS preflight for ${pathname}`);

    return handleCorsPreflightRequest(request);
  }

  // 2. Проверяем, является ли путь публичным
  const isPublic = isPublicPath(pathname);

  // 3. Специальная обработка для CRON задач
  if (pathname.startsWith("/api/cron")) {
    const authHeader = request.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");
    const cronApiKey = process.env.CRON_API_KEY;

    if (!apiKey || !cronApiKey || apiKey !== cronApiKey) {
      console.warn(
        `[Middleware] Unauthorized CRON access attempt for ${pathname}`,
      );

      const response = NextResponse.json(
        {
          error: "Unauthorized access",
          code: "CRON_AUTH_FAILED",
        },
        { status: 401 },
      );

      return applyCorsHeaders(request, response);
    }

    console.log(`[Middleware] CRON authentication successful for ${pathname}`);
    const response = NextResponse.next();

    return applyCorsHeaders(request, response);
  }

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
      console.log(
        `[Middleware] Missing token for protected route: ${pathname}`,
      );

      const response = NextResponse.json(
        {
          error: "Authentication required",
          code: "MISSING_TOKEN",
          message: "No authentication token provided",
        },
        { status: 401 },
      );

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

    const errorMessage =
      error instanceof Error ? error.message : "Authentication failed";
    let statusCode = 401;
    let errorCode = "INVALID_TOKEN";

    if (errorMessage.includes("expired")) {
      errorCode = "TOKEN_EXPIRED";
    } else if (errorMessage.includes("malformed")) {
      statusCode = 400;
      errorCode = "MALFORMED_TOKEN";
    }

    const response = NextResponse.json(
      {
        error: "Authentication failed",
        message: errorMessage,
        code: errorCode,
      },
      { status: statusCode },
    );

    return applyCorsHeaders(request, response);
  }
}
