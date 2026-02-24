import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';

// GET /api/partners/earnings - Get partner earnings dashboard
export const GET = withErrorHandler(async () => {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        include: { partnerProfile: true },
    });

    if (!dbUser || !dbUser.partnerProfile) {
        return apiError(404, 'Partner profile not found');
    }

    const partner = dbUser.partnerProfile;

    const assignments = await prisma.partnerAssignment.findMany({
        where: {
            partnerId: partner.id,
            status: { in: ['ACCEPTED', 'ACTIVE', 'COMPLETED'] },
        },
        include: {
            workspace: {
                select: {
                    id: true, name: true, slug: true, logo: true,
                    subscription: {
                        select: { plan: true, status: true, currentPeriodEnd: true },
                    },
                },
            },
        },
        orderBy: { assignedAt: 'desc' },
    });

    const activeAssignments = assignments.filter(
        a => a.status === 'ACCEPTED' || a.status === 'ACTIVE'
    );

    const planPrices: Record<string, number> = { FREE: 0, PERSONAL: 19, TEAM: 49, ENTERPRISE: 99 };

    let currentMonthEstimate = 0;
    activeAssignments.forEach(a => {
        if (a.workspace.subscription?.status === 'ACTIVE') {
            const planPrice = planPrices[a.workspace.subscription.plan] || 0;
            currentMonthEstimate += planPrice * Number(a.revenueSplit);
        }
    });

    const topWorkspaces = assignments
        .sort((a, b) => Number(b.totalEarnings) - Number(a.totalEarnings))
        .slice(0, 5)
        .map(a => ({
            workspace: a.workspace,
            totalEarnings: a.totalEarnings,
            status: a.status,
            assignedAt: a.assignedAt,
        }));

    return apiSuccess({
        summary: {
            totalEarnings: partner.totalEarnings,
            currentMonthEstimate,
            activeWorkspaces: activeAssignments.length,
            totalWorkspaces: assignments.length,
            certificationLevel: partner.certificationLevel,
            maxWorkspaces: partner.maxWorkspaces,
            availableSlots: partner.availableSlots,
        },
        topWorkspaces,
        assignments,
        stripeConnected: partner.stripeOnboarded,
    });
});
