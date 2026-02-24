import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';

// GET /api/assets/[id]/agent - Get agent connection for asset
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: assetId } = await context.params;
    const user = await requireAuth();

    const asset = await prisma.asset.findFirst({
        where: {
            id: assetId,
            workspace: {
                members: { some: { userId: user.id } },
            },
        },
        include: { agentConnection: true },
    });

    if (!asset) {
        return apiError(404, 'Asset not found or access denied');
    }

    if (!asset.agentConnection) {
        return apiError(404, 'No agent connected to this asset');
    }

    return apiSuccess(asset.agentConnection);
});
