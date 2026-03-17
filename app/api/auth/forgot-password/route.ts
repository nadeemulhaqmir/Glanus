import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api/response';
import { withErrorHandler } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/security/rateLimit';
import { AccountService } from '@/lib/services/AccountService';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address').transform(v => v.toLowerCase().trim()),
});

// POST /api/auth/forgot-password — Send password reset email (anti-enumeration)
export const POST = withErrorHandler(async (request: NextRequest) => {
    const rateLimitResponse = await withRateLimit(request, 'strict-api');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = forgotPasswordSchema.parse(body);

    // Always return success to prevent email enumeration
    await AccountService.forgotPassword(parsed.email);
    return apiSuccess({ message: 'If an account exists with that email, a reset link has been sent.' });
});
