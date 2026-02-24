import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { enrichMetric } from '@/lib/nerve/enrichment';
import { prisma } from '@/lib/db';

/**
 * GET /api/workspaces/[id]/intelligence/nerve
 *
 * Returns enriched telemetry data for all agents in the workspace.
 * Includes health scores, metric deviations, and correlated recent changes.
 */
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'MEMBER');

    const workspaceId = params.id;

    // Get all online agents in this workspace
    const agents = await prisma.agentConnection.findMany({
        where: { workspaceId, status: 'ONLINE' },
        select: {
            id: true,
            cpuUsage: true,
            ramUsage: true,
            diskUsage: true,
        },
    });

    // Enrich metrics for each agent in parallel
    const enrichedMetrics = await Promise.all(
        agents.map(agent =>
            enrichMetric(
                agent.id,
                agent.cpuUsage ?? 0,
                agent.ramUsage ?? 0,
                agent.diskUsage ?? 0,
            )
        )
    );

    // Filter out null results (agents without assets)
    const validMetrics = enrichedMetrics.filter(Boolean);

    return apiSuccess({
        metrics: validMetrics,
        summary: {
            totalAgents: agents.length,
            enrichedCount: validMetrics.length,
            avgHealthScore: validMetrics.length > 0
                ? Math.round(validMetrics.reduce((sum, m) => sum + (m?.healthScore ?? 0), 0) / validMetrics.length)
                : 100,
        },
    });
});
