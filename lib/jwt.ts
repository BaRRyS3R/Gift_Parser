// src/lib/jwt.ts - JWT utilities for secure authentication

import { SignJWT, jwtVerify } from "jose";

// JWT payload structure
export interface JWTPayload {
  userId: string;
  telegramId: number;
  iat?: number;
  exp?: number;
}

// Extended payload with Telegram data for token creation
export interface TelegramJWTPayload extends JWTPayload {
  telegramData: {
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium: boolean;
  };
  initDataHash: string; // For additional security verification
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = "24h"; // Token expires in 24 hours

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Convert string secret to Uint8Array for jose library
const secret = new TextEncoder().encode(JWT_SECRET);

/**
 * Creates a JWT token with user data and Telegram information
 */
export async function createJWT(payload: TelegramJWTPayload): Promise<string> {
  try {
    const jwt = await new SignJWT({
      userId: payload.userId,
      telegramId: payload.telegramId,
      telegramData: payload.telegramData,
      initDataHash: payload.initDataHash,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRATION)
      .setIssuer("circusle-app")
      .setAudience("circusle-users")
      .sign(secret);

    return jwt;
  } catch (error) {
    console.error("Error creating JWT:", error);
    throw new Error("Failed to create authentication token");
  }
}

/**
 * Verifies and decodes a JWT token
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: "circusle-app",
      audience: "circusle-users",
    });

    // Validate required fields
    if (!payload.userId || !payload.telegramId) {
      throw new Error("Invalid token payload");
    }

    return {
      userId: payload.userId as string,
      telegramId: payload.telegramId as number,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    console.error("Error verifying JWT:", error);
    throw new Error("Invalid or expired authentication token");
  }
}

/**
 * Extracts JWT token from Authorization header
 */
export function extractTokenFromHeader(
  authHeader: string | null,
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Validates token expiration
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) {
    return true; // Consider expired if no expiration time
  }

  const currentTime = Math.floor(Date.now() / 1000);

  return payload.exp < currentTime;
}

/**
 * Creates a refresh token (longer expiration)
 */
export async function createRefreshToken(
  payload: Omit<TelegramJWTPayload, "initDataHash">,
): Promise<string> {
  try {
    const jwt = await new SignJWT({
      userId: payload.userId,
      telegramId: payload.telegramId,
      type: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // Refresh token expires in 7 days
      .setIssuer("circusle-app")
      .setAudience("circusle-refresh")
      .sign(secret);

    return jwt;
  } catch (error) {
    console.error("Error creating refresh token:", error);
    throw new Error("Failed to create refresh token");
  }
}

/**
 * Verifies refresh token
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: "circusle-app",
      audience: "circusle-refresh",
    });

    if (payload.type !== "refresh") {
      throw new Error("Invalid refresh token type");
    }

    return {
      userId: payload.userId as string,
      telegramId: payload.telegramId as number,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    console.error("Error verifying refresh token:", error);
    throw new Error("Invalid or expired refresh token");
  }
}
