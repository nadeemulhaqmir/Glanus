import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';

// POST /api/onboarding/complete - Mark user's onboarding as complete
export const POST = withErrorHandler(async () => {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
    });

    if (!dbUser) {
        return apiError(404, 'User not found');
    }

    await prisma.user.update({
        where: { id: dbUser.id },
        data: { onboardingCompleted: true },
    });

    return apiSuccess({ success: true });
});
