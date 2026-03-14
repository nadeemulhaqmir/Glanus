/**
 * WorkspaceNotificationService — Unified notification feed for a workspace.
 *
 * Responsibilities:
 *  - getNotifications: merge and sort audit log events + AI insights into a single feed
 *
 * Extend by adding new event sources to the Promise.all in getNotifications.
 */
import { prisma } from '@/lib/db';

export class WorkspaceNotificationService {
    /**
     * Fetch up to `limit` notifications (capped at 200) for a workspace,
     * merging audit log events and AI insights into a chronological feed.
     */
    static async getNotifications(workspaceId: string, limit = 100) {
        const cap = Math.min(200, Math.max(1, limit));

        const [auditLogs, aiInsights] = await Promise.all([
            prisma.auditLog.findMany({
                where: { workspaceId },
                include: {
                    user: { select: { name: true, email: true } },
                    asset: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: cap,
            }),
            prisma.aIInsight.findMany({
                where: { workspaceId },
                include: { asset: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: cap,
            }),
        ]);

        const notifications = [
            ...(auditLogs).map((log) => ({
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
                    ...(typeof log.metadata === 'object' && log.metadata ? log.metadata : {}),
                },
            })),
            ...(aiInsights).map((insight) => ({
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
                    ...(typeof insight.metadata === 'object' && insight.metadata ? insight.metadata : {}),
                },
            })),
        ];

        notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return notifications.slice(0, cap);
    }
}
