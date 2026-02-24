/**
 * Security Headers Configuration
 * 
 * Defines secure HTTP headers to protect against common vulnerabilities.
 */

export interface SecurityHeaders {
    [key: string]: string;
}

/**
 * Get Content Security Policy header value
 */
export function getCSPHeader(): string {
    const isDev = process.env.NODE_ENV === 'development';

    const directives = [
        "default-src 'self'",
        // Next.js requires 'unsafe-inline' for hydration scripts and 'unsafe-eval' in dev for HMR
        `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data: https:",
        // WebSocket (dev HMR), Stripe, Sentry
        `connect-src 'self' ws: wss: https://*.stripe.com https://*.sentry.io${isDev ? ' http://localhost:*' : ''}`,
        "frame-ancestors 'none'",
        "frame-src 'self' https://*.stripe.com", // Stripe checkout iframe
        "base-uri 'self'",
        "form-action 'self'",
    ];

    return directives.join('; ');
}

/**
 * Get all security headers
 */
export function getSecurityHeaders(): SecurityHeaders {
    const corsOrigins = process.env.CORS_ALLOWED_ORIGINS || '';

    return {
        // Prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',

        // Prevent clickjacking
        'X-Frame-Options': 'DENY',

        // XSS protection (legacy but still useful)
        'X-XSS-Protection': '1; mode=block',

        // Content Security Policy
        'Content-Security-Policy': getCSPHeader(),

        // Force HTTPS
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

        // Control referrer information
        'Referrer-Policy': 'strict-origin-when-cross-origin',

        // CORS — configurable via CORS_ALLOWED_ORIGINS env variable
        ...(corsOrigins ? {
            'Access-Control-Allow-Origin': corsOrigins,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Request-Id',
            'Access-Control-Max-Age': '86400',
        } : {}),

        // Permissions policy (feature policy)
        'Permissions-Policy': [
            'camera=()',
            'microphone=()',
            'geolocation=()',
            'payment=()',
        ].join(', '),

        // Prevent DNS prefetching
        'X-DNS-Prefetch-Control': 'off',

        // Disable download prompts for certain MIME types
        'X-Download-Options': 'noopen',

        // Prevent browsers from making assumptions  
        'X-Permitted-Cross-Domain-Policies': 'none',
    };
}

/**
 * Apply security headers to a Response
 */
export function applySecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);
    const securityHeaders = getSecurityHeaders();

    for (const [key, value] of Object.entries(securityHeaders)) {
        headers.set(key, value);
    }

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

/**
 * Create a new Response with security headers
 */
export function createSecureResponse(
    body: any,
    init?: ResponseInit
): Response {
    const headers = new Headers(init?.headers);
    const securityHeaders = getSecurityHeaders();

    for (const [key, value] of Object.entries(securityHeaders)) {
        if (!headers.has(key)) {
            headers.set(key, value);
        }
    }

    return new Response(body, {
        ...init,
        headers,
    });
}
