import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess } from '@/lib/api/response';

export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(workspaceId, user.id);

    // Fetch unified event streams concurrently
    const [auditLogs, aiInsights] = await Promise.all([
        prisma.auditLog.findMany({
            where: { workspaceId },
            include: {
                user: { select: { name: true, email: true } },
                asset: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        }),
        prisma.aIInsight.findMany({
            where: { workspaceId },
            include: {
                asset: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        }),
    ]);

    // Normalize and unify streams into a single Notification array
    const notifications = [
        ...auditLogs.map((log: any) => ({
            id: log.id,
            type: 'audit',
            action: log.action,
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            actor: log.user?.name || log.user?.email || 'System',
            assetName: log.asset?.name || null,
            metadata: log.metadata,
            createdAt: log.createdAt.toISOString()
        })),
        ...aiInsights.map((insight: any) => ({
            id: insight.id,
            type: 'insight',
            action: `AI Insight: ${insight.title}`,
            resourceType: insight.type,
            resourceId: insight.assetId,
            actor: 'ORACLE / NERVE',
            assetName: insight.asset?.name || null,
            metadata: { severity: insight.severity, confidence: insight.confidence },
            createdAt: insight.createdAt.toISOString()
        }))
    ];

    // Sort chronologically descending
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return apiSuccess({
        notifications: notifications.slice(0, 100) // Keep the UI feed snappy 
    });
});
