import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';

// GET /api/partners/payouts - Get payout history
export const GET = withErrorHandler(async () => {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        include: { partnerProfile: true },
    });

    if (!dbUser || !dbUser.partnerProfile) {
        return apiError(404, 'Partner profile not found');
    }

    const payouts = await prisma.partnerPayout.findMany({
        where: { partnerId: dbUser.partnerProfile.id },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, amount: true, currency: true,
            periodStart: true, periodEnd: true, status: true,
            stripePayoutId: true, failureReason: true,
            workspaceCount: true, subscriptionDetails: true,
            createdAt: true, paidAt: true,
        },
    });

    const stats = {
        totalPaid: payouts.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0),
        pending: payouts.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING').reduce((sum, p) => sum + Number(p.amount), 0),
        failed: payouts.filter(p => p.status === 'FAILED').length,
        total: payouts.length,
    };

    return apiSuccess({ payouts, stats });
});
