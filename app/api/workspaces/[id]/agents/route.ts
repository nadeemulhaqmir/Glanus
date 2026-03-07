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
                }
            }
        },
        orderBy: { lastSeen: 'desc' }
    });

    const activeVersions = await prisma.agentVersion.findMany({
        where: { status: 'ACTIVE' }
    });

    const data = agents.map((agent: any) => {
        const activeRelease = activeVersions.find((v: any) => v.platform === agent.platform);
        const isOutdated = activeRelease ? agent.agentVersion !== activeRelease.version : false;

        return {
            id: agent.id,
            status: agent.status,
            platform: agent.platform,
            hostname: agent.hostname,
            agentVersion: agent.agentVersion,
            isOutdated,
            ipAddress: agent.ipAddress || null,
            lastSeen: agent.lastSeen,
            cpuUsage: agent.cpuUsage || null,
            ramUsage: agent.ramUsage || null,
            diskUsage: agent.diskUsage || null,
            asset: agent.asset
        };
    });

    // Calculate actual active stats (Online in last 10 minutes)
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const onlineAgents = agents.filter((a: any) => a.status === 'ONLINE' && a.lastSeen > tenMinsAgo);
    const offlineAgents = agents.filter((a: any) => a.status === 'OFFLINE' || a.lastSeen <= tenMinsAgo);
    const errorAgents = agents.filter((a: any) => a.status === 'ERROR');

    return apiSuccess({
        agents: data,
        stats: {
            total: agents.length,
            online: onlineAgents.length,
            offline: offlineAgents.length,
            error: errorAgents.length
        }
    });
});
