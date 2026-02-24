import { apiSuccess } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess, withErrorHandler } from '@/lib/api/withAuth';

// GET /api/workspaces/[id]/agents - List workspace agents
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(workspaceId, user.id);

    const agents = await prisma.agentConnection.findMany({
        where: { workspaceId },
        include: {
            asset: {
                select: {
                    id: true,
                    name: true,
                    model: true,
                    serialNumber: true,
                },
            },
        },
        orderBy: { lastSeen: 'desc' },
    });

    const stats = {
        total: agents.length,
        online: agents.filter((a) => a.status === 'ONLINE').length,
        offline: agents.filter((a) => a.status === 'OFFLINE').length,
        error: agents.filter((a) => a.status === 'ERROR').length,
    };

    return apiSuccess({ agents, stats });
});
