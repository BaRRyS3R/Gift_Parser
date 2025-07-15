// middleware.ts - Application middleware for API protection

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

// Define paths that require authentication
const protectedApiPaths = [
  '/api/user/',
  '/api/game/',
  '/api/tournament/',
  '/api/security/',
];

// Define paths that don't require authentication
const publicApiPaths = [
  '/api/auth/login',
  '/api/health',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public API paths
  if (publicApiPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if this is a protected API path
  const isProtectedPath = protectedApiPaths.some(path => pathname.startsWith(path));

  if (isProtectedPath) {
    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          message: 'No valid authorization header provided'
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    try {
      // Verify JWT token
      const validation = await verifyToken(token);
      
      if (!validation.isValid || !validation.payload) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid token',
            message: validation.error || 'Token validation failed'
          },
          { status: 401 }
        );
      }

      // Add user info to request headers for API routes to use
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', validation.payload.userId);
      requestHeaders.set('x-telegram-id', validation.payload.telegramId.toString());

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error('Middleware authentication error:', error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication failed',
          message: 'Token verification failed'
        },
        { status: 401 }
      );
    }
  }

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
    '/((?!_next/static|_next/image|favicon.ico|public|videos|fonts).*)',
  ],
};