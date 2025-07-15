// src/middleware.ts - Next.js middleware for enhanced security

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security headers for all responses
  const response = NextResponse.next();

  // Apply security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Block direct Supabase access attempts
  const blockSupabaseAccess = checkAndBlockSupabaseAccess(request);
  if (blockSupabaseAccess) {
    return blockSupabaseAccess;
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const rateLimitResponse = applyRateLimiting(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  // Additional security checks for sensitive API routes
  if (
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/security/") ||
    pathname.includes("delete") ||
    pathname.includes("admin")
  ) {
    const adminCheck = checkAdminAccess(request);
    if (adminCheck) {
      return adminCheck;
    }
  }

  // Block suspicious requests
  const suspiciousCheck = checkSuspiciousActivity(request);
  if (suspiciousCheck) {
    return suspiciousCheck;
  }

  return response;
}

/**
 * Block direct Supabase API access attempts
 */
function checkAndBlockSupabaseAccess(
  request: NextRequest,
): NextResponse | null {
  const userAgent = request.headers.get("user-agent") || "";
  const apiKey = request.headers.get("apikey");
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type") || "";

  // Detect direct Supabase client usage patterns
  const suspiciousPatterns = [
    userAgent.toLowerCase().includes("supabase"),
    userAgent.toLowerCase().includes("postgrest"),
    apiKey !== null, // Any apikey header is suspicious
    request.url.includes("supabase.co"),
    request.url.includes("/rest/v1/"),
    contentType.includes("application/vnd.pgrst"),
    // Block authorization headers that don't match our JWT format
    authorization &&
      !authorization.startsWith("Bearer ey") &&
      authorization.startsWith("Bearer"),
  ];

  if (suspiciousPatterns.some((pattern) => pattern)) {
    console.warn("Blocked direct Supabase access attempt:", {
      url: request.url,
      userAgent: userAgent.substring(0, 100),
      hasApiKey: !!apiKey,
      hasAuth: !!authorization,
      ip: request.headers.get("x-forwarded-for") || "unknown",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Direct database access is forbidden",
        code: "DIRECT_DB_ACCESS_BLOCKED",
        timestamp: new Date().toISOString(),
      },
      { status: 403 },
    );
  }

  return null;
}

/**
 * Apply rate limiting to API routes
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMITS = {
  "/api/auth/": 5, // Authentication endpoints
  "/api/game/": 30, // Game endpoints
  "/api/security/": 10, // Security endpoints
  "/api/": 60, // General API limit
};

function applyRateLimiting(request: NextRequest): NextResponse | null {
  // Use x-forwarded-for header for IP, fallback to "unknown"
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const pathname = request.nextUrl.pathname;

  // Clean up expired rate limit entries before proceeding
  const now = Date.now();
  requestCounts.forEach((data, key) => {
    if (now > data.resetTime) {
      requestCounts.delete(key);
    }
  });

  // Determine rate limit based on endpoint
  let limit = RATE_LIMITS["/api/"]; // Default
  for (const [path, pathLimit] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(path)) {
      limit = pathLimit;
      break;
    }
  }

  const key = `${ip}:${pathname.split("/").slice(0, 4).join("/")}`;
  const current = requestCounts.get(key);

  if (!current || now > current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return null;
  }

  if (current.count >= limit) {
    console.warn("Rate limit exceeded:", {
      ip,
      pathname,
      count: current.count,
      limit,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((current.resetTime - now) / 1000).toString(),
        },
      },
    );
  }

  current.count++;
  return null;
}

/**
 * Check for admin access on sensitive routes
 */
function checkAdminAccess(request: NextRequest): NextResponse | null {
  const authorization = request.headers.get("authorization");

  if (!authorization || !authorization.startsWith("Bearer ey")) {
    return NextResponse.json(
      {
        error: "Administrative access requires authentication",
        code: "ADMIN_AUTH_REQUIRED",
      },
      { status: 401 },
    );
  }

  // Additional admin checks could be added here
  return null;
}

/**
 * Check for suspicious activity patterns
 */
function checkSuspiciousActivity(request: NextRequest): NextResponse | null {
  const userAgent = request.headers.get("user-agent") || "";
  const pathname = request.nextUrl.pathname;

  // Block requests with suspicious user agents
  const suspiciousUserAgents = [
    "curl",
    "wget",
    "python-requests",
    "postman",
    "insomnia",
    "httpie",
    "rest-client",
  ];

  const isSuspiciousUserAgent = suspiciousUserAgents.some((agent) =>
    userAgent.toLowerCase().includes(agent.toLowerCase()),
  );

  // Block requests to non-existent endpoints that might be probing
  const suspiciousEndpoints = [
    "/.env",
    "/admin",
    "/config",
    "/wp-admin",
    "/phpmyadmin",
    "/.git",
    "/api/admin",
    "/api/config",
  ];

  const isSuspiciousEndpoint = suspiciousEndpoints.some((endpoint) =>
    pathname.toLowerCase().includes(endpoint.toLowerCase()),
  );

  // Allow legitimate development tools in development mode
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  if (isSuspiciousUserAgent || isSuspiciousEndpoint) {
    console.warn("Blocked suspicious request:", {
      url: request.url,
      userAgent: userAgent.substring(0, 100),
      ip: request.headers.get("x-forwarded-for") || "unknown",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Request blocked",
        code: "SUSPICIOUS_ACTIVITY",
      },
      { status: 403 },
    );
  }

  return null;
}

/**
 * Clean up old rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  requestCounts.forEach((data, key) => {
    if (now > data.resetTime) {
      requestCounts.delete(key);
    }
  });
}, RATE_LIMIT_WINDOW);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
