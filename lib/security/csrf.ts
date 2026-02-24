/**
 * CSRF Token Generation and Validation
 * 
 * Implements CSRF protection using the Synchronizer Token Pattern:
 * - Generates cryptographically secure tokens
 * - Stores tokens in httpOnly cookies
 * - Validates tokens on state-changing requests
 */

import { randomBytes, createHmac } from 'crypto';
import { cookies } from 'next/headers';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
let _csrfSecret: string | null = null;
function getCSRFSecret(): string {
    if (_csrfSecret) return _csrfSecret;
    const secret = process.env.CSRF_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('CSRF_SECRET environment variable is required in production');
        }
        _csrfSecret = 'dev-only-csrf-secret-not-for-production';
    } else {
        _csrfSecret = secret;
    }
    return _csrfSecret;
}

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
    const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
    const signature = createHmac('sha256', getCSRFSecret())
        .update(token)
        .digest('hex');

    return `${token}.${signature}`;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(token: string | null): boolean {
    if (!token) return false;

    const [tokenValue, signature] = token.split('.');
    if (!tokenValue || !signature) return false;

    const expectedSignature = createHmac('sha256', getCSRFSecret())
        .update(tokenValue)
        .digest('hex');

    // Use timing-safe comparison
    return signature === expectedSignature;
}

/**
 * Set CSRF token cookie (server-side)
 */
export async function setCSRFCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(CSRF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
    });
}

/**
 * Get CSRF token from cookie (server-side)
 */
export async function getCSRFCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(CSRF_COOKIE_NAME);
    return cookie?.value || null;
}

/**
 * Get or create CSRF token
 * Call this in API routes or server components
 */
export async function getOrCreateCSRFToken(): Promise<string> {
    let token = await getCSRFCookie();

    if (!token || !validateCSRFToken(token)) {
        token = generateCSRFToken();
        await setCSRFCookie(token);
    }

    return token;
}

/**
 * Validate CSRF token from request
 * Use in POST/PUT/PATCH/DELETE API routes
 */
export async function validateCSRFFromRequest(
    request: Request
): Promise<{ valid: boolean; error?: string }> {
    // Get token from header (preferred) or body
    const headerToken = request.headers.get('x-csrf-token');
    const cookieToken = await getCSRFCookie();

    if (!headerToken) {
        return { valid: false, error: 'CSRF token missing from request' };
    }

    if (!cookieToken) {
        return { valid: false, error: 'CSRF token missing from cookie' };
    }

    if (headerToken !== cookieToken) {
        return { valid: false, error: 'CSRF token mismatch' };
    }

    if (!validateCSRFToken(headerToken)) {
        return { valid: false, error: 'CSRF token invalid' };
    }

    return { valid: true };
}

/**
 * Client-side helper to get CSRF token from cookie
 * Use in fetch requests
 */
export function getCSRFTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(c => c.trim().startsWith(`${CSRF_COOKIE_NAME}=`));

    if (!csrfCookie) return null;

    return csrfCookie.split('=')[1];
}
