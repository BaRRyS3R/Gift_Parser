// middleware.ts - Enhanced middleware with trust score verification

import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { supabaseServer } from "@/lib/supabase-server";

// Define paths that require authentication
const protectedApiPaths = [
  "/api/user/",
  "/api/game/",
  "/api/tournament/",
  "/api/security/",
  "/api/leagues/",
  "/api/profile/",
  "/api/tasks/",
  "/api/leaderboard/",
  "/api/purchases/",
];

// Define paths that don't require authentication
const publicApiPaths = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/health",
  "/api/check-telegram-membership"
];

// SECURITY: Define paths that require trust score verification
const trustScoreProtectedPaths = [
  "/api/game/",           // All game-related actions
  "/api/tournament/",     // Tournament participation
  "/api/purchases/",      // Purchase actions (prevent fraud)
  "/api/tasks/complete",  // Task completion (prevent automation)
  "/api/user/profile",    // Profile updates (prevent abuse)
];

// SECURITY: Define paths that should NEVER require trust score (to allow verification)
const trustScoreExemptPaths = [
  "/api/security/",           // Security verification endpoints
  "/api/auth/",              // Authentication endpoints
  "/api/user/attempts-status", // Allow checking attempts
  "/api/profile/",           // Allow profile viewing
  "/api/tasks",              // Allow viewing tasks (but not completing)
  "/api/leaderboard/",       // Allow viewing leaderboards
];

// Trust score thresholds
const TRUST_SCORE_THRESHOLDS = {
  GYROSCOPE: 10,
  BIOMETRIC: 20,
  CAPTCHA: 40,
  GOOD: 60,
} as const;

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;
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
 * SECURITY: Check user trust score and determine if verification is needed
 */
async function checkTrustScore(telegramId: number): Promise<{
  isBlocked: boolean;
  needsVerification: boolean;
  trustScore: number;
  verificationType?: "gyroscope" | "biometric" | "captcha";
  timeUntilUnblock?: number;
}> {
  try {
    // First check and unblock if time has passed
    const { error: unblockError } = await supabaseServer.rpc(
      "check_and_unblock_user",
      { user_telegram_id: telegramId }
    );

    if (unblockError) {
      console.error("Error checking unblock status:", unblockError.message);
    }

    // Get current user data
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("trust_score, blocked_until, is_active")
      .eq("telegram_id", telegramId)
      .single();

    if (userError || !user) {
      console.error("Database error fetching user for trust check:", userError);
      // If we can't verify trust score, deny access
      return {
        isBlocked: true,
        needsVerification: false,
        trustScore: 0,
      };
    }

    // Check if user is currently blocked
    const serverTime = new Date();
    const isBlocked = user.blocked_until
      ? new Date(user.blocked_until) > serverTime
      : false;

    if (isBlocked) {
      const timeUntilUnblock = user.blocked_until
        ? new Date(user.blocked_until).getTime() - serverTime.getTime()
        : 0;

      return {
        isBlocked: true,
        needsVerification: false,
        trustScore: user.trust_score || 0,
        timeUntilUnblock: timeUntilUnblock > 0 ? timeUntilUnblock : 0,
      };
    }

    const trustScore = user.trust_score || 50;

    // Determine verification requirements based on trust score
    let needsVerification = false;
    let verificationType: "gyroscope" | "biometric" | "captcha" | undefined;

    if (trustScore < TRUST_SCORE_THRESHOLDS.GYROSCOPE) {
      needsVerification = true;
      verificationType = "gyroscope";
    } else if (trustScore < TRUST_SCORE_THRESHOLDS.BIOMETRIC) {
      needsVerification = true;
      verificationType = "biometric";
    } else if (trustScore < TRUST_SCORE_THRESHOLDS.CAPTCHA) {
      needsVerification = true;
      verificationType = "captcha";
    }

    return {
      isBlocked: false,
      needsVerification,
      trustScore,
      verificationType,
    };
  } catch (error) {
    console.error("Error checking trust score:", error);
    // On error, deny access for security
    return {
      isBlocked: true,
      needsVerification: false,
      trustScore: 0,
    };
  }
}

/**
 * Enhanced middleware with trust score verification
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
    pathname.startsWith(path)
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
        { status: 401 }
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
          { status: 401 }
        );
      }

      // Apply rate limiting per authenticated user
      const rateLimitKey = `user_${validation.payload.userId}`;

      if (!checkRateLimit(rateLimitKey)) {
        console.warn(
          `Rate limit exceeded for user ${validation.payload.userId} on ${pathname}`
        );

        return NextResponse.json(
          {
            success: false,
            error: "Rate limit exceeded",
            message: "Too many requests. Please try again later.",
          },
          { status: 429 }
        );
      }

      // SECURITY: Check if this path requires trust score verification
      const requiresTrustCheck = trustScoreProtectedPaths.some((path) =>
        pathname.startsWith(path)
      );

      const isExemptFromTrustCheck = trustScoreExemptPaths.some((path) =>
        pathname.startsWith(path)
      );

      if (requiresTrustCheck && !isExemptFromTrustCheck) {
        console.log(`Checking trust score for protected path: ${pathname}`);

        const trustCheck = await checkTrustScore(validation.payload.telegramId);

        // If user is blocked, return block status
        if (trustCheck.isBlocked) {
          console.warn(
            `Blocked user ${validation.payload.telegramId} attempted to access: ${pathname}`
          );

          return NextResponse.json(
            {
              success: false,
              error: "Account blocked",
              message: "Your account is temporarily restricted",
              isBlocked: true,
              timeUntilUnblock: trustCheck.timeUntilUnblock,
              blockStatus: {
                isBlocked: true,
                timeUntilUnblock: trustCheck.timeUntilUnblock,
              },
            },
            { status: 403 }
          );
        }

        // If user needs verification, return verification requirement
        if (trustCheck.needsVerification) {
          console.warn(
            `User ${validation.payload.telegramId} needs ${trustCheck.verificationType} verification for: ${pathname}`
          );

          return NextResponse.json(
            {
              success: false,
              error: "Verification required",
              message: "Please complete security verification to continue",
              needsVerification: true,
              verificationType: trustCheck.verificationType,
              securityStatus: {
                needsVerification: true,
                verificationType: trustCheck.verificationType,
                trustScore: trustCheck.trustScore,
              },
            },
            { status: 423 } // 423 Locked - custom status for verification needed
          );
        }

        console.log(
          `Trust score check passed for user ${validation.payload.telegramId} (score: ${trustCheck.trustScore}) on ${pathname}`
        );
      }

      // Add user info to request headers for API routes to use
      const requestHeaders = new Headers(request.headers);

      requestHeaders.set("x-user-id", validation.payload.userId);
      requestHeaders.set(
        "x-telegram-id",
        validation.payload.telegramId.toString()
      );

      // Add additional security headers for specific endpoints
      if (pathname.startsWith("/api/tournament/")) {
        requestHeaders.set("x-protected-resource", "tournament");
        requestHeaders.set("x-request-timestamp", Date.now().toString());
      } else if (pathname.startsWith("/api/purchases/")) {
        requestHeaders.set("x-protected-resource", "purchases");
        requestHeaders.set("x-request-timestamp", Date.now().toString());
      } else if (pathname.startsWith("/api/tasks/")) {
        requestHeaders.set("x-protected-resource", "tasks");
        requestHeaders.set("x-request-timestamp", Date.now().toString());
      } else if (pathname.startsWith("/api/game/")) {
        requestHeaders.set("x-protected-resource", "game");
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
        { status: 401 }
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