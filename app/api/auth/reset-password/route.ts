import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { withErrorHandler } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/security/rateLimit';
import { prisma } from '@/lib/db';
import { verifyResetToken } from '@/lib/auth/password-reset';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

// POST /api/auth/reset-password — Validate token and set new password
export const POST = withErrorHandler(async (request: NextRequest) => {
    const rateLimitResponse = await withRateLimit(request, 'strict-api');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
        return apiError(400, parsed.error.errors[0].message);
    }

    const { token, password } = parsed.data;

    const result = verifyResetToken(token);
    if (!result) {
        return apiError(400, 'Invalid or tampered reset link. Please request a new one.');
    }
    if (result.expired) {
        return apiError(400, 'This reset link has expired. Please request a new one.');
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    if (!user) {
        return apiError(400, 'Invalid reset link.');
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
        where: { id: result.userId },
        data: { password: hashedPassword },
    });

    return apiSuccess({ message: 'Password has been reset successfully. You can now sign in.' });
});
