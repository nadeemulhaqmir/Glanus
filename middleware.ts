/**
 * Next.js Security Middleware
 * 
 * Enforces security policies on all requests:
 * - Applies security headers
 * - Validates CSRF tokens on mutations
 * - Logs security events
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSecurityHeaders } from './lib/security/headers';

// Routes that don't need CSRF protection
const CSRF_EXEMPT_PATHS = [
    '/api/auth/',        // NextAuth handles its own CSRF
    '/api/webhooks/',    // Webhooks use signature verification
    '/api/agent/',       // Agent endpoints use API key auth
    '/api/health',       // Health check
    '/api/ready',        // Readiness probe
];

// Public routes (no authentication required)
const PUBLIC_PATHS = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/_next',
    '/favicon.ico',
    '/monitoring',       // Sentry
    '/api/health',
    '/api/ready',
    '/api/auth/',        // NextAuth + custom auth endpoints
    '/api/csrf',         // CSRF token endpoint
    '/api/partners',     // Public partner directory
    '/api/invitations',  // Invitation verification (token-based)
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for Next.js internal routes and static files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon.ico') ||
        pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
    ) {
        return NextResponse.next();
    }

    // Create response with security headers
    const response = NextResponse.next();
    const securityHeaders = getSecurityHeaders(request);

    // Apply security headers to all responses
    for (const [key, value] of Object.entries(securityHeaders)) {
        response.headers.set(key, value);
    }

    // Add request ID for tracing
    const requestId = crypto.randomUUID();
    response.headers.set('X-Request-Id', requestId);

    // CSRF Protection for state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const isExempt = CSRF_EXEMPT_PATHS.some(path => pathname.startsWith(path));

        if (!isExempt) {
            const csrfTokenHeader = request.headers.get('x-csrf-token');
            const csrfTokenCookie = request.cookies.get('csrf-token')?.value;

            // Validate CSRF token presence and match
            if (!csrfTokenHeader || !csrfTokenCookie) {
                return NextResponse.json(
                    { error: 'CSRF token missing' },
                    { status: 403, headers: { 'X-Request-Id': requestId } }
                );
            }

            if (csrfTokenHeader !== csrfTokenCookie) {
                return NextResponse.json(
                    { error: 'CSRF token mismatch' },
                    { status: 403, headers: { 'X-Request-Id': requestId } }
                );
            }
        }
    }

    return response;
}

// Configure which routes use this middleware
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
