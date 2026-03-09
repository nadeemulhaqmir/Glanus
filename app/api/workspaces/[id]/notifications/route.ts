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

    // Parse limit from query params (default 100, max 200)
    const url = new URL(request.url);
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '100')));

    // Fetch unified event streams concurrently
    const [auditLogs, aiInsights] = await Promise.all([
        prisma.auditLog.findMany({
            where: { workspaceId },
            include: {
                user: { select: { name: true, email: true } },
                asset: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        }),
        prisma.aIInsight.findMany({
            where: { workspaceId },
            include: {
                asset: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        }),
    ]);

    // Normalize into unified BaseNotification shape matching frontend interface
    const notifications = [
        ...auditLogs.map((log: any) => ({
            id: log.id,
            type: 'AUDIT_LOG' as const,
            title: log.action,
            description: log.resourceType
                ? `${log.resourceType} ${log.resourceId ? `(${log.resourceId.slice(0, 8)}...)` : ''}`
                : 'System event',
            severity: 'INFO' as const,
            createdAt: log.createdAt.toISOString(),
            metadata: {
                actor: log.user?.name || log.user?.email || 'System',
                assetName: log.asset?.name || null,
                resourceType: log.resourceType,
                resourceId: log.resourceId,
                ...(typeof log.metadata === 'object' && log.metadata ? log.metadata : {})
            },
        })),
        ...aiInsights.map((insight: any) => ({
            id: insight.id,
            type: 'AI_INSIGHT' as const,
            title: insight.title,
            description: insight.description,
            severity: (insight.severity || 'INFO') as 'INFO' | 'WARNING' | 'CRITICAL',
            confidence: insight.confidence,
            createdAt: insight.createdAt.toISOString(),
            metadata: {
                insightType: insight.type,
                assetName: insight.asset?.name || null,
                assetId: insight.assetId,
                ...(typeof insight.metadata === 'object' && insight.metadata ? insight.metadata : {})
            },
        }))
    ];

    // Sort chronologically descending and apply limit
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return apiSuccess({
        notifications: notifications.slice(0, limit)
    });
});
