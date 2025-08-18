// src/lib/cors.ts - Centralized CORS configuration

import { NextRequest, NextResponse } from "next/server";

// Определяем разрешенные origins из переменных окружения и статичных значений
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_ALLOWED_ORIGIN,
  "https://web.telegram.org",
  "https://notfren.com",
  "https://telegram.org",
  "https://cron-job.org",
  "https://www.circusle.xyz",
  "https://circusle.xyz",
  // Добавляем localhost только для разработки
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : null,
  process.env.NODE_ENV === "development" ? "http://localhost:3001" : null,
].filter(Boolean) as string[];

// Специальные origins для определенных путей
const SPECIAL_ORIGINS: Record<string, string[]> = {
  "/api/cron": ["https://cron-job.org"],
  "/api/ton": ["https://web.telegram.org", "https://telegram.org"],
};

/**
 * Проверяет, разрешен ли origin для данного пути
 */
function isOriginAllowed(origin: string | null, pathname: string): boolean {
  if (!origin) {
    // Разрешаем запросы без origin (например, с того же домена или серверные запросы)
    return true;
  }

  // Проверяем специальные origins для определенных путей
  for (const [pathPrefix, allowedOrigins] of Object.entries(SPECIAL_ORIGINS)) {
    if (pathname.startsWith(pathPrefix)) {
      return (
        allowedOrigins.includes(origin) || ALLOWED_ORIGINS.includes(origin)
      );
    }
  }

  // Проверяем общий список разрешенных origins
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Применяет CORS заголовки к ответу
 */
export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const origin = request.headers.get("origin");
  const pathname = request.nextUrl.pathname;

  // Логирование для отладки (можно убрать в продакшене)
  if (process.env.NODE_ENV === "development") {
    console.log(`[CORS] Request from origin: ${origin} to path: ${pathname}`);
  }

  // Проверяем, разрешен ли origin
  if (isOriginAllowed(origin, pathname)) {
    // Если origin разрешен, используем его
    // Если origin отсутствует (same-origin запрос), используем первый разрешенный origin
    const responseOrigin = origin || ALLOWED_ORIGINS[0];

    response.headers.set("Access-Control-Allow-Origin", responseOrigin);

    // ВАЖНО: Когда устанавливаем credentials в true, нельзя использовать wildcard (*)
    response.headers.set("Access-Control-Allow-Credentials", "true");
  } else {
    // Если origin не разрешен, НЕ устанавливаем CORS заголовки
    // Браузер заблокирует такой запрос
    console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);

    // Опционально: можно вернуть 403 для неразрешенных origins
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        JSON.stringify({ error: "CORS: Origin not allowed" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  // Устанавливаем остальные CORS заголовки
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  );

  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-Telegram-ID, X-User-ID, X-Auth-Verified",
  );

  // Разрешаем браузеру читать определенные заголовки из ответа
  response.headers.set(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Type, X-Request-Id",
  );

  // Кэшируем preflight запросы на 24 часа
  response.headers.set("Access-Control-Max-Age", "86400");

  // Дополнительные заголовки безопасности
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

/**
 * Обрабатывает OPTIONS (preflight) запросы
 */
export function handleCorsPreflightRequest(request: NextRequest): NextResponse {
  // Создаем пустой успешный ответ для preflight
  const response = new NextResponse(null, { status: 200 });

  // Применяем CORS заголовки
  return applyCorsHeaders(request, response);
}

/**
 * Проверяет, нужна ли аутентификация для данного пути
 */
export function isPublicPath(pathname: string): boolean {
  const publicPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/health",
    "/api/status",
    "/api/ton/products",
    "/api/ton/create-order",
    "/api/ton/order-status",
  ];

  // Проверяем точное совпадение или префикс для cron задач
  return publicPaths.includes(pathname) || pathname.startsWith("/api/cron/");
}

/**
 * Экспортируем список разрешенных origins для использования в других местах
 */
export const getAllowedOrigins = () => ALLOWED_ORIGINS;

/**
 * Вспомогательная функция для проверки CRON запросов
 */
export function isCronRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const pathname = request.nextUrl.pathname;

  return pathname.startsWith("/api/cron") && origin === "https://cron-job.org";
}

/**
 * Типы для CORS конфигурации
 */
export interface CorsOptions {
  origins?: string[];
  credentials?: boolean;
  methods?: string[];
  headers?: string[];
  exposeHeaders?: string[];
  maxAge?: number;
}

/**
 * Создает middleware с кастомными CORS настройками
 */
export function createCorsMiddleware(options: CorsOptions = {}) {
  return (request: NextRequest, response: NextResponse) => {
    const {
      origins = ALLOWED_ORIGINS,
      credentials = true,
      methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      headers = ["Content-Type", "Authorization"],
      exposeHeaders = ["Content-Length", "Content-Type"],
      maxAge = 86400,
    } = options;

    const origin = request.headers.get("origin");

    if (origin && origins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);

      if (credentials) {
        response.headers.set("Access-Control-Allow-Credentials", "true");
      }
    }

    response.headers.set("Access-Control-Allow-Methods", methods.join(", "));
    response.headers.set("Access-Control-Allow-Headers", headers.join(", "));
    response.headers.set(
      "Access-Control-Expose-Headers",
      exposeHeaders.join(", "),
    );
    response.headers.set("Access-Control-Max-Age", maxAge.toString());

    return response;
  };
}
