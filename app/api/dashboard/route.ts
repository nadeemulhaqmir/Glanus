import { apiSuccess } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { withErrorHandler, requireAuth } from '@/lib/api/withAuth';

export const GET = withErrorHandler(async () => {
    await requireAuth();

    // Get statistics
    const [totalAssets, totalUsers, activeSessions, recentInsights] = await Promise.all([
        prisma.asset.count(),
        prisma.user.count(),
        prisma.remoteSession.count({
            where: { status: 'ACTIVE' },
        }),
        prisma.aIInsight.count({
            where: { acknowledged: false },
        }),
    ]);

    // Get recent assets
    const recentAssets = await prisma.asset.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            assignedTo: {
                select: { name: true, email: true },
            },
        },
    });

    // Get active remote sessions
    const sessions = await prisma.remoteSession.findMany({
        where: { status: 'ACTIVE' },
        include: {
            asset: { select: { name: true, category: true } },
            user: { select: { name: true, email: true } },
        },
        take: 10,
    });

    return apiSuccess({
        stats: {
            totalAssets,
            totalUsers,
            activeSessions,
            pendingInsights: recentInsights,
        },
        recentAssets,
        activeSessions: sessions,
    });
});

