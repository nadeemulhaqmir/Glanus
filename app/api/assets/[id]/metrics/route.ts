import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';

// GET /api/assets/[id]/metrics - Get agent metrics for asset
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: assetId } = await context.params;
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';

    const now = new Date();
    const startTime = new Date();
    switch (timeRange) {
        case '1h': startTime.setHours(now.getHours() - 1); break;
        case '24h': startTime.setHours(now.getHours() - 24); break;
        case '7d': startTime.setDate(now.getDate() - 7); break;
        case '30d': startTime.setDate(now.getDate() - 30); break;
        default: startTime.setHours(now.getHours() - 24);
    }

    const asset = await prisma.asset.findFirst({
        where: {
            id: assetId,
            workspace: {
                members: { some: { userId: user.id } },
            },
        },
    });

    if (!asset) {
        return apiError(404, 'Asset not found or access denied');
    }

    const metrics = await prisma.agentMetric.findMany({
        where: { assetId, timestamp: { gte: startTime } },
        orderBy: { timestamp: 'asc' },
    });

    return apiSuccess({ metrics, timeRange, count: metrics.length });
});
