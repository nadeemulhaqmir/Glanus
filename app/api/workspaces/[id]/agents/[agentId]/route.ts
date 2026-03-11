import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';

/**
 * GET /api/workspaces/[id]/agents/[agentId]
 * Fetch detailed agent information including:
 *   - Agent system info & current metrics
 *   - Last 24h of metric history from AgentMetric table
 *   - Recent script executions dispatched to this agent
 */
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string; agentId: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'MEMBER');

    // Fetch agent with asset relation
    const agent = await prisma.agentConnection.findUnique({
        where: { id: params.agentId, workspaceId: params.id },
        include: {
            asset: {
                select: {
                    id: true,
                    name: true,
                    assetType: true,
                    status: true,
                    serialNumber: true,
                    manufacturer: true,
                    model: true,
                    location: true,
                }
            },
            installedSoftware: {
                orderBy: { name: 'asc' }
            }
        }
    });

    if (!agent) {
        return apiError(404, 'Agent not found.');
    }

    // Fetch metric history (last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const [metricHistory, recentExecutions] = await Promise.all([
        prisma.agentMetric.findMany({
            where: {
                agentId: params.agentId,
                timestamp: { gte: twentyFourHoursAgo },
            },
            select: {
                id: true,
                cpuUsage: true,
                ramUsage: true,
                diskUsage: true,
                timestamp: true,
            },
            orderBy: { timestamp: 'asc' },
            take: 288, // ~5min intervals over 24h
        }),

        // Recent script executions dispatched to this agent
        prisma.scriptExecution.findMany({
            where: {
                agentId: params.agentId,
                workspaceId: params.id,
            },
            include: {
                script: {
                    select: { id: true, name: true, language: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        }),
    ]);

    return apiSuccess({
        agent,
        metricHistory,
        recentExecutions,
    });
});
