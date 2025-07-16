// middleware.ts - Enhanced middleware with comprehensive tournament API protection

import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";

// Define paths that require authentication
const protectedApiPaths = [
  "/api/user/",
  "/api/game/",
  "/api/tournament/", // All tournament endpoints are protected
  "/api/security/",
  "/api/leagues/",
  "/api/profile/",
  "/api/leaderboard/", // All leaderboard endpoints are protected
];

// Define paths that don't require authentication
const publicApiPaths = ["/api/auth/login", "/api/auth/register", "/api/health"];

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // Increased limit for tournament operations
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

/**
 * Basic rate limiting implementation
 */
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now - userLimit.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(identifier, { count: 1, lastReset: now });

    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;

  return true;
}

/**
 * Enhanced middleware with tournament-specific protection
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for non-API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public API paths without authentication
  if (publicApiPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if this is a protected API path
  const isProtectedPath = protectedApiPaths.some((path) =>
    pathname.startsWith(path),
  );

  if (isProtectedPath) {
    // Extract JWT token from Authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn(`Protected API access attempt without auth: ${pathname}`);

      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          message: "No valid authorization header provided",
          requiredAuth: true,
        },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);

    try {
      // Verify JWT token
      const validation = await verifyToken(token);

      if (!validation.isValid || !validation.payload) {
        console.warn(`Invalid token attempt for: ${pathname}`);

        return NextResponse.json(
          {
            success: false,
            error: "Invalid token",
            message: validation.error || "Token validation failed",
            requiredAuth: true,
          },
          { status: 401 },
        );
      }

      // Apply rate limiting per authenticated user
      const rateLimitKey = `user_${validation.payload.userId}`;

      if (!checkRateLimit(rateLimitKey)) {
        console.warn(
          `Rate limit exceeded for user ${validation.payload.userId} on ${pathname}`,
        );

        return NextResponse.json(
          {
            success: false,
            error: "Rate limit exceeded",
            message: "Too many requests. Please try again later.",
          },
          { status: 429 },
        );
      }

      // Add user info to request headers for API routes to use
      const requestHeaders = new Headers(request.headers);

      requestHeaders.set("x-user-id", validation.payload.userId);
      requestHeaders.set(
        "x-telegram-id",
        validation.payload.telegramId.toString(),
      );

      // Add additional security headers for tournament endpoints
      if (pathname.startsWith("/api/tournament/")) {
        requestHeaders.set("x-protected-resource", "tournament");
        requestHeaders.set("x-request-timestamp", Date.now().toString());
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error("Middleware authentication error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Authentication failed",
          message: "Token verification failed",
          requiredAuth: true,
        },
        { status: 401 },
      );
    }
  }

  // Log unprotected API access for monitoring
  console.info(`Unprotected API access: ${pathname}`);

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public|videos|fonts).*)",
  ],
};
