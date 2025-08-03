// src/middleware.ts - Corrected JWT validation middleware

import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

import { verifyJWT, extractTokenFromHeader } from "./lib/jwt";

// FIXED: Simplified matcher configuration to avoid conflicts
export const config = {
  matcher: [
    // Only match protected API routes, exclude auth routes
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
    "/api/easter-egg/:path*"
  ],
};

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/cron/:path*",
  "/api/health",
  "/api/status",
];

// Admin endpoints that require special permissions
const ADMIN_ENDPOINTS = [
  "/api/admin/",
  "/api/tournament/create",
  "/api/tournament/manage",
];

/**
 * Handle CORS preflight requests
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
    "https://cron-job.org",
    "http://localhost:3000", // For development
  ].filter(Boolean);

  const origin = request.headers.get("origin");

  const response = new NextResponse(null, { status: 200 });

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // Allow same-origin requests without origin header
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Requested-With",
  );
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

/**
 * Add CORS headers to response
 */
function addCORSHeaders(response: NextResponse, request: NextRequest): void {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_ALLOWED_ORIGIN,
    "https://web.telegram.org",
    "https://notfren.com",
    "https://telegram.org",
    "http://localhost:3000", // For development
  ].filter(Boolean);

  const origin = request.headers.get("origin");

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // Allow same-origin requests without origin header
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Requested-With",
  );
}

/**
 * Middleware function to validate JWT tokens on protected routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] ${request.method} ${pathname}`);

  // Handle CORS preflight requests first
  const corsResponse = handleCORSPreflight(request);

  if (corsResponse) {
    console.log(`[Middleware] CORS preflight handled for ${pathname}`);

    return corsResponse;
  }

  // IMPORTANT: Auth endpoints should not be processed by this middleware
  // due to the matcher configuration, but we add this check as a safety net
  const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
    pathname.startsWith(endpoint),
  );

  if (isPublicEndpoint) {
    console.log(`[Middleware] Public endpoint bypassed: ${pathname}`);
    const response = NextResponse.next();

    addCORSHeaders(response, request);

    return response;
  }

  try {
    // Extract token from Authorization header
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

      addCORSHeaders(response, request);

      return response;
    }

    // Verify JWT token
    console.log(`[Middleware] Verifying token for: ${pathname}`);
    const payload = await verifyJWT(token);

    // Check for admin endpoints
    if (ADMIN_ENDPOINTS.some((endpoint) => pathname.startsWith(endpoint))) {
      console.log(
        `[Middleware] Admin endpoint accessed by user: ${payload.userId}`,
      );
      // Future: Add admin role validation here
    }

    // Add user data to request headers for API routes
    const requestHeaders = new Headers(request.headers);

    requestHeaders.set("X-User-ID", payload.userId);
    requestHeaders.set("X-Telegram-ID", payload.telegramId.toString());
    requestHeaders.set("X-Auth-Verified", "true");

    console.log(`[Middleware] Token verified for user: ${payload.userId}`);

    // Create response with modified headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    addCORSHeaders(response, request);

    return response;
  } catch (error) {
    console.error(`[Middleware] JWT validation error for ${pathname}:`, error);

    // Determine error type and return appropriate response
    const errorMessage =
      error instanceof Error ? error.message : "Authentication failed";

    let statusCode = 401;
    let errorCode = "INVALID_TOKEN";

    if (errorMessage.includes("expired")) {
      statusCode = 401;
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

    addCORSHeaders(response, request);

    return response;
  }
}
