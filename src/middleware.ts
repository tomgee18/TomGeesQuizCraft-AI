import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to add security headers to all responses
 */
export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();

  // Add security headers
  const headers = response.headers;

  // Content Security Policy
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://unpkg.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https://storage.googleapis.com https://placehold.co; " +
    "connect-src 'self' https://generativelanguage.googleapis.com; " +
    "object-src 'none'; " +
    "form-action 'self'; " +
    "frame-src 'self'; " +
    "base-uri 'self'; " +
    "upgrade-insecure-requests;"
  );

  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');

  // Enable browser XSS protection
  headers.set('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Set strict transport security for HTTPS
  headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  return response;
}

// Specify which paths this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};