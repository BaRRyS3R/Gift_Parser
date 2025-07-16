// src/lib/authMiddleware.ts - Updated authentication middleware with secure session handling

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "./jwt";
import { supabaseServer } from "./supabase-server";

export interface AuthenticatedRequest extends NextRequest {
  user: {
    sessionId: string;
    telegramId: number;
    userId?: string; // Only available when resolved server-side
  };
}

/**
 * Higher-order function that wraps API handlers with enhanced authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Verify JWT token and extract secure payload
      const authPayload = await requireAuth(request);

      // Add secure user data to request object
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = {
        sessionId: authPayload.sessionId,
        telegramId: authPayload.telegramId,
      };

      // Resolve actual user ID server-side when needed (for database operations)
      try {
        const { data: user } = await supabaseServer
          .from("users")
          .select("id")
          .eq("telegram_id", authPayload.telegramId)
          .single();

        if (user) {
          authenticatedRequest.user.userId = user.id;
        }
      } catch (dbError) {
        console.error("Error resolving user ID:", dbError);
        // Continue without userId - some operations might not need it
      }

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
 * Enhanced rate limiting with session-based tracking
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15; // Reduced limit for tighter security

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
 * Enhanced authentication wrapper with rate limiting and security logging
 */
export function withAuthAndRateLimit<T extends any[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Verify JWT token first
      const authPayload = await requireAuth(request);

      // Apply rate limiting per session
      const rateLimitKey = `session_${authPayload.sessionId}`;

      if (!rateLimit(rateLimitKey)) {
        console.warn(`Rate limit exceeded for session: ${authPayload.sessionId}`);

        return NextResponse.json(
          {
            success: false,
            error: "Rate limit exceeded",
            message: "Too many requests. Please try again later.",
          },
          { status: 429 },
        );
      }

      // Resolve user ID and add to request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = {
        sessionId: authPayload.sessionId,
        telegramId: authPayload.telegramId,
      };

      try {
        const { data: user } = await supabaseServer
          .from("users")
          .select("id, blocked_until")
          .eq("telegram_id", authPayload.telegramId)
          .single();

        if (user) {
          authenticatedRequest.user.userId = user.id;

          // Check if user is currently blocked
          if (user.blocked_until && new Date(user.blocked_until) > new Date()) {
            return NextResponse.json(
              {
                success: false,
                error: "Account temporarily blocked",
                message: "Your account is currently restricted. Please try again later.",
              },
              { status: 403 },
            );
          }
        } else {
          // User not found in database
          return NextResponse.json(
            {
              success: false,
              error: "User not found",
              message: "User account not found. Please re-authenticate.",
            },
            { status: 404 },
          );
        }
      } catch (dbError) {
        console.error("Database error in auth middleware:", dbError);
        return NextResponse.json(
          {
            success: false,
            error: "Database error",
            message: "Unable to verify user account. Please try again.",
          },
          { status: 500 },
        );
      }

      // Call the original handler
      return await handler(authenticatedRequest, ...args);
    } catch (error) {
      console.error("Enhanced authentication middleware error:", error);

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
 * CORS helper for API routes with security headers
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

  // Enhanced security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  return response;
}

/**
 * Enhanced wrapper with CORS support and security headers
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

      // Add CORS and security headers to response
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

/**
 * Utility function to safely extract session information from request
 */
export function getSessionInfo(request: AuthenticatedRequest): {
  sessionId: string;
  telegramId: number;
  userId?: string;
} {
  return {
    sessionId: request.user.sessionId,
    telegramId: request.user.telegramId,
    userId: request.user.userId,
  };
}

/**
 * Security logging utility for audit trails
 */
export function logSecurityEvent(
  event: string,
  sessionId: string,
  details?: Record<string, any>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    sessionId: sessionId.substring(0, 8) + "...", // Partial session ID for security
    details: details || {},
  };

  // In production, this would go to a proper logging service
  if (process.env.NODE_ENV === "development") {
    console.log("Security Event:", logEntry);
  }
}