// src/lib/jwt.ts - JWT service with enhanced security and hidden UUIDs

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";

// Secret key from environment
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-chars-long",
);

const JWT_EXPIRES_IN = "7d"; // Token validity period

export interface CustomJWTPayload {
  sessionId: string; // Hashed identifier instead of UUID
  telegramId: number;
  iat: number;
  exp: number;
}

export interface TokenValidationResult {
  isValid: boolean;
  payload?: CustomJWTPayload;
  error?: string;
}

/**
 * Generate secure session identifier from UUID
 */
function generateSessionId(userId: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(userId + process.env.JWT_SECRET);
  return hash.digest('hex').substring(0, 32);
}

/**
 * Generate JWT token for authenticated user with secure session ID
 */
export async function generateToken(
  userId: string,
  telegramId: number,
): Promise<string> {
  try {
    const sessionId = generateSessionId(userId);

    const token = await new SignJWT({
      sessionId, // Secure hashed session ID instead of UUID
      telegramId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(JWT_SECRET);

    return token;
  } catch (error) {
    console.error("Error generating JWT token:", error);
    throw new Error("Failed to generate authentication token");
  }
}

/**
 * Verify JWT token and extract payload
 */
export async function verifyToken(
  token: string,
): Promise<TokenValidationResult> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    return {
      isValid: true,
      payload: payload as unknown as CustomJWTPayload,
    };
  } catch (error) {
    console.error("JWT verification failed:", error);

    let errorMessage = "Invalid token";

    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        errorMessage = "Token expired";
      } else if (error.message.includes("signature")) {
        errorMessage = "Invalid token signature";
      }
    }

    return {
      isValid: false,
      error: errorMessage,
    };
  }
}

/**
 * Extract token from request headers
 */
export function extractTokenFromHeaders(headers: Headers): string | null {
  const authHeader = headers.get("authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Set JWT token in HTTP-only cookie (for SSR)
 */
export async function setTokenCookie(
  userId: string,
  telegramId: number,
): Promise<void> {
  const token = await generateToken(userId, telegramId);
  const cookieStore = await cookies();

  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: "/",
  });
}

/**
 * Get token from cookies (for SSR)
 */
export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token");

  return token?.value || null;
}

/**
 * Clear authentication cookie
 */
export async function clearTokenCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete("auth-token");
}

/**
 * Validate Telegram WebApp init data
 * This adds an extra layer of security by verifying Telegram's signature
 */
export function validateTelegramInitData(initData: string): boolean {
  // This is a simplified validation - in production, implement full Telegram signature verification
  // according to: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

  if (!initData || initData.length < 10) {
    return false;
  }

  try {
    // Basic format validation
    const params = new URLSearchParams(initData);
    const user = params.get("user");
    const hash = params.get("hash");

    if (!user || !hash) {
      return false;
    }

    // Parse user data
    const userData = JSON.parse(user);

    if (!userData.id || !userData.first_name) {
      return false;
    }

    // In production, implement full HMAC-SHA256 verification here
    // For now, we trust the basic format validation
    return true;
  } catch (error) {
    console.error("Telegram init data validation failed:", error);

    return false;
  }
}

/**
 * Middleware helper for API route protection with session resolution
 */
export async function requireAuth(request: Request): Promise<{
  sessionId: string;
  telegramId: number;
  userId?: string; // Only available server-side when needed
}> {
  const token = extractTokenFromHeaders(request.headers);

  if (!token) {
    throw new Error("Authentication token required");
  }

  const validation = await verifyToken(token);

  if (!validation.isValid || !validation.payload) {
    throw new Error(validation.error || "Invalid authentication token");
  }

  return {
    sessionId: validation.payload.sessionId,
    telegramId: validation.payload.telegramId,
  };
}

/**
 * Server-side function to resolve user ID from session ID (when needed)
 */
export function resolveUserIdFromSession(sessionId: string, candidateUserId: string): boolean {
  const expectedSessionId = generateSessionId(candidateUserId);
  return sessionId === expectedSessionId;
}