// src/lib/jwt.ts - JWT service for secure token management

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";

// Secret key from environment
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-chars-long",
);

const JWT_EXPIRES_IN = "7d"; // Token validity period

export interface CustomJWTPayload {
  userId: string;
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
 * Generate JWT token for authenticated user
 */
export async function generateToken(
  userId: string,
  telegramId: number,
): Promise<string> {
  try {
    const token = await new SignJWT({
      userId,
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
 * Validate Telegram WebApp init data (production-ready)
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(initData: string): boolean {
  try {
    if (!initData || initData.length < 10) return false;
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;
    params.delete("hash");

    // Формируем data_check_string
    const dataCheckString = Array.from(params.entries())
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join("\n");

    // Ключ — sha256(botToken)
    const botToken = process.env.TELEGRAM_BOT_API;
    if (!botToken) {
      console.error("TELEGRAM_BOT_API env not set");
      return false;
    }
    const secret = crypto.createHash("sha256").update(botToken).digest("hex");

    // HMAC-SHA256
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(dataCheckString)
      .digest("hex");

    // Сравниваем с hash из initData (без учёта регистра)
    return hmac === hash || hmac === hash.toLowerCase();
  } catch (error) {
    console.error("Telegram init data validation failed:", error);
    return false;
  }
}

/**
 * Middleware helper for API route protection
 */
export async function requireAuth(request: Request): Promise<CustomJWTPayload> {
  const token = extractTokenFromHeaders(request.headers);

  if (!token) {
    throw new Error("Authentication token required");
  }

  const validation = await verifyToken(token);

  if (!validation.isValid || !validation.payload) {
    throw new Error(validation.error || "Invalid authentication token");
  }

  return validation.payload;
}
