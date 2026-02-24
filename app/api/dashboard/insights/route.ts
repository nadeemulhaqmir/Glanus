import { apiSuccess } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { withErrorHandler, requireAuth } from '@/lib/api/withAuth';

/**
 * GET /api/dashboard/insights
 * 
 * Aggregates AI insights across all workspaces the user has access to.
 * Returns recent insights, severity breakdown, and trend data.
 */
export const GET = withErrorHandler(async () => {
    const user = await requireAuth();

    // Get workspace IDs the user has access to
    const memberships = await prisma.workspaceMember.findMany({
        where: { userId: user.id },
        select: { workspaceId: true },
    });

    const ownedWorkspaces = await prisma.workspace.findMany({
        where: { ownerId: user.id },
        select: { id: true },
    });

    const workspaceIds = [
        ...new Set([
            ...memberships.map((m) => m.workspaceId),
            ...ownedWorkspaces.map((w) => w.id),
        ]),
    ];

    // Get asset IDs in those workspaces
    const assetIds = await prisma.asset.findMany({
        where: {
            workspaceId: { in: workspaceIds },
            deletedAt: null,
        },
        select: { id: true },
    });

    const assetIdList = assetIds.map((a) => a.id);

    // Recent insights for those assets
    const [insights, severityCounts, totalCount, unacknowledgedCount] = await Promise.all([
        prisma.aIInsight.findMany({
            where: {
                OR: [
                    { assetId: { in: assetIdList } },
                    { userId: user.id },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                asset: {
                    select: { id: true, name: true, status: true },
                },
            },
        }),

        // Severity breakdown
        prisma.aIInsight.groupBy({
            by: ['severity'],
            where: {
                OR: [
                    { assetId: { in: assetIdList } },
                    { userId: user.id },
                ],
            },
            _count: true,
        }),

        // Total count
        prisma.aIInsight.count({
            where: {
                OR: [
                    { assetId: { in: assetIdList } },
                    { userId: user.id },
                ],
            },
        }),

        // Unacknowledged count
        prisma.aIInsight.count({
            where: {
                acknowledged: false,
                OR: [
                    { assetId: { in: assetIdList } },
                    { userId: user.id },
                ],
            },
        }),
    ]);

    // Format severity breakdown
    const severityBreakdown = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
    };

    for (const group of severityCounts) {
        const key = (group.severity || 'info').toLowerCase();
        if (key in severityBreakdown) {
            severityBreakdown[key as keyof typeof severityBreakdown] = group._count;
        }
    }

    return apiSuccess({
        insights,
        summary: {
            total: totalCount,
            unacknowledged: unacknowledgedCount,
            severity: severityBreakdown,
            workspaceCount: workspaceIds.length,
        },
    });
});
