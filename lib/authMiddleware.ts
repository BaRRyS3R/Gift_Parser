// src/lib/authMiddleware.ts - Authentication middleware for API protection

import { NextRequest, NextResponse } from "next/server";

import { requireAuth, type CustomJWTPayload } from "./jwt";

export interface AuthenticatedRequest extends NextRequest {
  user: CustomJWTPayload;
}

/**
 * Higher-order function that wraps API handlers with authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Verify JWT token and extract user payload
      const userPayload = await requireAuth(request);

      // Add user data to request object
      const authenticatedRequest = request as AuthenticatedRequest;

      authenticatedRequest.user = userPayload;

      // Call the original handler with authenticated request
      return await handler(authenticatedRequest, ...args);
    } catch (error) {
      console.error("Authentication middleware error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          message:
            error instanceof Error
              ? error.message
              : "Invalid or missing authentication token",
        },
        { status: 401 },
      );
    }
  };
}

/**
 * Rate limiting helper (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // max requests per window

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
 * Enhanced authentication wrapper with rate limiting
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

      // Add user data to request
      const authenticatedRequest = request as AuthenticatedRequest;

      authenticatedRequest.user = userPayload;

      // Call the original handler
      return await handler(authenticatedRequest, ...args);
    } catch (error) {
      console.error("Authentication middleware error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          message:
            error instanceof Error
              ? error.message
              : "Invalid or missing authentication token",
        },
        { status: 401 },
      );
    }
  };
}

/**
 * CORS helper for API routes
 */
export function setCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Access-Control-Allow-Origin",
    process.env.NEXT_PUBLIC_ALLOWED_ORIGIN || "*",
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

/**
 * Enhanced wrapper with CORS support
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
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        },
        { status: 500 },
      );

      return setCorsHeaders(errorResponse);
    }
  };
}
