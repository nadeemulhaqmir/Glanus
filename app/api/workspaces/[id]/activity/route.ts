import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceAccess, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess } from '@/lib/api/response';
import { prisma } from '@/lib/db';

interface ActivityItem {
    id: string;
    type: 'audit' | 'alert' | 'agent' | 'insight';
    title: string;
    description: string;
    severity?: string;
    actor?: { name: string | null; email: string } | null;
    resource?: { type: string; id: string; name?: string | null } | null;
    timestamp: string;
}

/**
 * GET /api/workspaces/[id]/activity
 * Unified workspace activity feed combining:
 *   - Audit log entries
 *   - Alert rule triggers
 *   - Agent status changes
 *   - AI Insight discoveries
 * 
 * Query params:
 *   - limit: number (default 50, max 200)
 *   - cursor: ISO timestamp for cursor-based pagination (fetch items before this)
 *   - types: comma-separated filter ('audit,alert,agent,insight')
 */
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(params.id, user.id);

    const url = new URL(request.url);
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
    const cursor = url.searchParams.get('cursor');
    const typesParam = url.searchParams.get('types');
    const enabledTypes = new Set(typesParam ? typesParam.split(',') : ['audit', 'alert', 'agent', 'insight']);

    const cursorDate = cursor ? new Date(cursor) : undefined;
    const items: ActivityItem[] = [];
    const queries: Promise<void>[] = [];

    // ─── Audit Logs ──────────────────────────────────────
    if (enabledTypes.has('audit')) {
        queries.push(
            prisma.auditLog.findMany({
                where: {
                    workspaceId: params.id,
                    ...(cursorDate && { createdAt: { lt: cursorDate } }),
                },
                include: {
                    user: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            }).then(logs => {
                for (const log of logs) {
                    items.push({
                        id: `audit-${log.id}`,
                        type: 'audit',
                        title: formatAuditAction(log.action),
                        description: log.resourceType
                            ? `${log.resourceType} • ${log.resourceId || 'N/A'}`
                            : log.action,
                        actor: log.user,
                        resource: log.resourceType ? {
                            type: log.resourceType,
                            id: log.resourceId || '',
                        } : undefined,
                        timestamp: log.createdAt.toISOString(),
                    });
                }
            })
        );
    }

    // ─── Alert Rules ─────────────────────────────────────
    if (enabledTypes.has('alert')) {
        queries.push(
            prisma.alertRule.findMany({
                where: {
                    workspaceId: params.id,
                    ...(cursorDate && { updatedAt: { lt: cursorDate } }),
                },
                select: {
                    id: true,
                    name: true,
                    severity: true,
                    metric: true,
                    enabled: true,
                    threshold: true,
                    updatedAt: true,
                },
                orderBy: { updatedAt: 'desc' },
                take: limit,
            }).then(alerts => {
                for (const a of alerts) {
                    items.push({
                        id: `alert-${a.id}`,
                        type: 'alert',
                        title: `Alert: ${a.name}`,
                        description: `${a.metric} > ${a.threshold} • Severity: ${a.severity} • ${a.enabled ? 'Enabled' : 'Disabled'}`,
                        severity: a.severity,
                        timestamp: a.updatedAt.toISOString(),
                    });
                }
            })
        );
    }

    // ─── Agent Status Events ─────────────────────────────
    if (enabledTypes.has('agent')) {
        queries.push(
            prisma.agentConnection.findMany({
                where: {
                    workspaceId: params.id,
                    ...(cursorDate && { lastSeen: { lt: cursorDate } }),
                },
                select: {
                    id: true,
                    hostname: true,
                    status: true,
                    platform: true,
                    ipAddress: true,
                    lastSeen: true,
                    asset: { select: { id: true, name: true } },
                },
                orderBy: { lastSeen: 'desc' },
                take: limit,
            }).then(agents => {
                for (const agent of agents) {
                    items.push({
                        id: `agent-${agent.id}`,
                        type: 'agent',
                        title: `Agent: ${agent.hostname}`,
                        description: `${agent.platform} • ${agent.status} • ${agent.ipAddress || 'No IP'}`,
                        severity: agent.status === 'OFFLINE' ? 'warning' : undefined,
                        resource: agent.asset ? {
                            type: 'asset',
                            id: agent.asset.id,
                            name: agent.asset.name,
                        } : undefined,
                        timestamp: agent.lastSeen.toISOString(),
                    });
                }
            })
        );
    }

    // ─── AI Insights ─────────────────────────────────────
    if (enabledTypes.has('insight')) {
        queries.push(
            prisma.aIInsight.findMany({
                where: {
                    workspaceId: params.id,
                    ...(cursorDate && { createdAt: { lt: cursorDate } }),
                },
                select: {
                    id: true,
                    title: true,
                    type: true,
                    severity: true,
                    confidence: true,
                    acknowledged: true,
                    createdAt: true,
                    asset: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            }).then(insights => {
                for (const ins of insights) {
                    items.push({
                        id: `insight-${ins.id}`,
                        type: 'insight',
                        title: ins.title,
                        description: `${ins.type} • ${ins.severity || 'info'} • ${ins.acknowledged ? 'Acknowledged' : 'Unacknowledged'}`,
                        severity: ins.severity || undefined,
                        resource: ins.asset ? {
                            type: 'asset',
                            id: ins.asset.id,
                            name: ins.asset.name,
                        } : undefined,
                        timestamp: ins.createdAt.toISOString(),
                    });
                }
            })
        );
    }

    await Promise.all(queries);

    // Sort all items by timestamp descending, then truncate to limit
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const page = items.slice(0, limit);

    const nextCursor = page.length > 0 ? page[page.length - 1].timestamp : null;

    return apiSuccess({
        items: page,
        nextCursor,
        hasMore: items.length > limit,
    });
});

/**
 * Convert audit action slugs to human-readable labels.
 */
function formatAuditAction(action: string): string {
    const parts = action.split('.');
    const resource = parts[0]?.replace(/_/g, ' ') || '';
    const verb = parts[1]?.replace(/_/g, ' ') || action;
    return `${capitalize(resource)} ${verb}`;
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
