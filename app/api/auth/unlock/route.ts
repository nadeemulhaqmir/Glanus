/**
 * Account Unlock API
 * Allows manual unlock of locked accounts (admin only)
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { resetRateLimit, withRateLimit } from '@/lib/security/rateLimit';
import { unlockSchema } from '@/lib/schemas/workspace.schemas';

// POST /api/auth/unlock - Unlock a locked account (admin only)
export const POST = withErrorHandler(async (request: NextRequest) => {
    const rateLimitResponse = await withRateLimit(request, 'strict-api');
    if (rateLimitResponse) return rateLimitResponse;

    const user = await requireAuth();

    if (user.role !== 'ADMIN') {
        return apiError(401, 'Unauthorized');
    }

    const body = await request.json();
    const parsed = unlockSchema.safeParse(body);
    if (!parsed.success) {
        return apiError(400, parsed.error.errors[0].message);
    }
    const { email } = parsed.data;

    await resetRateLimit(email, 'login');

    return apiSuccess({ message: `Account for ${email} has been unlocked`, email });
});
