// src/lib/authMiddleware.ts - Enhanced authentication middleware with improved security headers

import { NextRequest, NextResponse } from "next/server";

import { requireAuth, type CustomJWTPayload } from "./jwt";

export interface AuthenticatedRequest extends NextRequest {
  user: CustomJWTPayload;
}

/**
 * Enhanced authentication wrapper with proper header injection for security APIs
 */
export function withAuth<T extends any[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Verify JWT token and extract user payload
      const userPayload = await requireAuth(request);

      // Create authenticated request with user data
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = userPayload;

      // Add user information to headers for downstream API calls
      const headers = new Headers(request.headers);
      headers.set("x-user-id", userPayload.userId);
      headers.set("x-telegram-id", userPayload.telegramId.toString());

      // Create new request with enhanced headers
      const enhancedRequest = new NextRequest(request.url, {
        method: request.method,
        headers,
        body: request.body,
      });

      // Add user data to enhanced request
      (enhancedRequest as AuthenticatedRequest).user = userPayload;

      // Call the original handler with enhanced request
      return await handler(enhancedRequest as AuthenticatedRequest, ...args);
    } catch (error) {
      console.error("Authentication middleware error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          message: error instanceof Error ? error.message : "Invalid or missing authentication token",
        },
        { status: 401 },
      );
    }
  };
}

/**
 * Rate limiting implementation with per-user tracking
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 30; // Increased limit for security APIs

export function rateLimit(identifier: string): boolean {
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
 * Enhanced authentication wrapper with rate limiting and improved headers
 */
export function withAuthAndRateLimit<T extends any[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Verify JWT token first
      const userPayload = await requireAuth(request);

      // Apply rate limiting per user
      const rateLimitKey = `user_${userPayload.userId}`;
      if (!rateLimit(rateLimitKey)) {
        return NextResponse.json(
          {
            success: false,
            error: "Rate limit exceeded",
            message: "Too many requests. Please try again later.",
          },
          { status: 429 },
        );
      }

      // Create enhanced headers with user information
      const headers = new Headers(request.headers);
      headers.set("x-user-id", userPayload.userId);
      headers.set("x-telegram-id", userPayload.telegramId.toString());

      // Create authenticated request with enhanced headers
      const enhancedRequest = new NextRequest(request.url, {
        method: request.method,
        headers,
        body: request.body,
      });

      // Add user data to request
      (enhancedRequest as AuthenticatedRequest).user = userPayload;

      // Call the original handler
      return await handler(enhancedRequest as AuthenticatedRequest, ...args);
    } catch (error) {
      console.error("Authentication middleware error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          message: error instanceof Error ? error.message : "Invalid or missing authentication token",
        },
        { status: 401 },
      );
    }
  };
}

/**
 * CORS configuration for security APIs
 */
export function setCorsHeaders(response: NextResponse): NextResponse {
  const allowedOrigin = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN || "*";

  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-id, x-telegram-id");
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

/**
 * Complete authentication wrapper with CORS and rate limiting
 */
export function withAuthCorsAndRateLimit<T extends any[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 200 });
      return setCorsHeaders(response);
    }

    try {
      // Apply authentication and rate limiting
      const authenticatedHandler = withAuthAndRateLimit(handler);
      const response = await authenticatedHandler(request, ...args);

      // Add CORS headers to response
      return setCorsHeaders(response);
    } catch (error) {
      console.error("Auth CORS middleware error:", error);

      const errorResponse = NextResponse.json(
        {
          success: false,
          error: "Request processing failed",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
        { status: 500 },
      );

      return setCorsHeaders(errorResponse);
    }
  };
}

/**
 * Security-focused middleware for trust score sensitive endpoints
 */
export function withSecurityAuth<T extends any[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Verify JWT token with stricter validation
      const userPayload = await requireAuth(request);

      // Apply more restrictive rate limiting for security endpoints
      const rateLimitKey = `security_${userPayload.userId}`;
      const securityRateLimitMap = new Map<string, { count: number; lastReset: number }>();
      const SECURITY_RATE_LIMIT_WINDOW = 30 * 1000; // 30 seconds window
      const SECURITY_RATE_LIMIT_MAX = 10; // Lower limit for security operations

      const now = Date.now();
      const userLimit = securityRateLimitMap.get(rateLimitKey);

      if (!userLimit || now - userLimit.lastReset > SECURITY_RATE_LIMIT_WINDOW) {
        securityRateLimitMap.set(rateLimitKey, { count: 1, lastReset: now });
      } else if (userLimit.count >= SECURITY_RATE_LIMIT_MAX) {
        return NextResponse.json(
          {
            success: false,
            error: "Security rate limit exceeded",
            message: "Too many security operations. Please wait before retrying.",
          },
          { status: 429 },
        );
      } else {
        userLimit.count++;
      }

      // Create enhanced headers with comprehensive user information
      const headers = new Headers(request.headers);
      headers.set("x-user-id", userPayload.userId);
      headers.set("x-telegram-id", userPayload.telegramId.toString());
      headers.set("x-security-context", "trust-score-validation");

      // Create authenticated request with security headers
      const securityRequest = new NextRequest(request.url, {
        method: request.method,
        headers,
        body: request.body,
      });

      // Add user data to request
      (securityRequest as AuthenticatedRequest).user = userPayload;

      // Call the original handler
      return await handler(securityRequest as AuthenticatedRequest, ...args);
    } catch (error) {
      console.error("Security authentication middleware error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Security authentication required",
          message: error instanceof Error ? error.message : "Invalid security authentication",
        },
        { status: 401 },
      );
    }
  };
}