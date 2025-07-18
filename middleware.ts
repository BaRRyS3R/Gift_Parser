// src/middleware.ts - JWT validation middleware for API protection

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT, extractTokenFromHeader } from './lib/jwt';

// Configuration for middleware
export const config = {
  matcher: [
    '/api/user/:path*',
    '/api/game/:path*',
    '/api/tournament/:path*',
    '/api/league/:path*',
    '/api/tasks/:path*',
    '/api/purchase/:path*',
    '/api/referral/:path*', // later
    // Exclude auth endpoints from protection
    '/((?!api/auth).*)',
  ],
};

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/health', // later
  '/api/status', // later
];

// Admin endpoints that require special permissions
const ADMIN_ENDPOINTS = [
  '/api/admin/', // later
  '/api/tournament/create',
  '/api/tournament/manage',
];

/**
 * Middleware function to validate JWT tokens on protected routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public endpoints
  if (PUBLIC_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))) {
    return NextResponse.next();
  }

  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'MISSING_TOKEN' 
        },
        { status: 401 }
      );
    }

    // Verify JWT token
    const payload = await verifyJWT(token);

    // Check for admin endpoints
    if (ADMIN_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))) {
      // For now, we'll implement basic admin check later
      // This is a placeholder for future admin role validation
      console.log('Admin endpoint accessed by user:', payload.userId);
    }

    // Add user data to request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-User-ID', payload.userId);
    requestHeaders.set('X-Telegram-ID', payload.telegramId.toString());
    requestHeaders.set('X-Auth-Verified', 'true');

    // Create response with modified headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Add CORS headers for allowed origins
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_ALLOWED_ORIGIN,
      'https://web.telegram.org',
      'https://telegram.org',
    ].filter(Boolean);

    const origin = request.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }

    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, X-Requested-With'
    );

    return response;

  } catch (error) {
    console.error('JWT validation error:', error);
    
    // Determine error type and return appropriate response
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    
    let statusCode = 401;
    let errorCode = 'INVALID_TOKEN';
    
    if (errorMessage.includes('expired')) {
      statusCode = 401;
      errorCode = 'TOKEN_EXPIRED';
    } else if (errorMessage.includes('malformed')) {
      statusCode = 400;
      errorCode = 'MALFORMED_TOKEN';
    }

    return NextResponse.json(
      { 
        error: 'Authentication failed',
        message: errorMessage,
        code: errorCode 
      },
      { status: statusCode }
    );
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export function handleCORS(request: NextRequest) {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_ALLOWED_ORIGIN,
    'https://web.telegram.org',
    'https://telegram.org',
  ].filter(Boolean);

  const origin = request.headers.get('origin');
  
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, X-Requested-With'
    );
    response.headers.set('Access-Control-Max-Age', '86400');
    
    return response;
  }
  
  return null;
}