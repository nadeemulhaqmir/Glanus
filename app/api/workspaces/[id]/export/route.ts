import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { prisma } from '@/lib/db';

/**
 * GET /api/workspaces/[id]/export
 * Export workspace data as JSON or CSV for compliance and backup.
 * 
 * Query params:
 *   - format: 'json' (default) or 'csv'
 *   - scope: 'all' (default), 'assets', 'agents', 'alerts', 'audit'
 */
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    // Only ADMINs can export workspace data
    await requireWorkspaceRole(params.id, user.id, 'ADMIN');

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const scope = url.searchParams.get('scope') || 'all';

    const exportData: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        workspaceId: params.id,
        exportedBy: user.id,
        format,
        scope,
    };

    // Fetch data based on scope
    const includeAssets = scope === 'all' || scope === 'assets';
    const includeAgents = scope === 'all' || scope === 'agents';
    const includeAlerts = scope === 'all' || scope === 'alerts';
    const includeAudit = scope === 'all' || scope === 'audit';

    const queries: Promise<void>[] = [];

    if (includeAssets) {
        queries.push(
            prisma.asset.findMany({
                where: { workspaceId: params.id },
                include: {
                    category: { select: { name: true, icon: true } },
                    assignedTo: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
            }).then(assets => { exportData.assets = assets; })
        );
    }

    if (includeAgents) {
        queries.push(
            prisma.agentConnection.findMany({
                where: { workspaceId: params.id },
                include: {
                    asset: { select: { name: true } },
                },
                orderBy: { lastSeen: 'desc' },
            }).then(agents => { exportData.agents = agents; })
        );
    }

    if (includeAlerts) {
        queries.push(
            prisma.alertRule.findMany({
                where: { workspaceId: params.id },
                orderBy: { createdAt: 'desc' },
            }).then(alerts => { exportData.alertRules = alerts; })
        );
    }

    if (includeAudit) {
        queries.push(
            prisma.auditLog.findMany({
                where: { workspaceId: params.id },
                include: {
                    user: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 1000, // Cap audit logs at 1000 most recent
            }).then(logs => { exportData.auditLogs = logs; })
        );
    }

    await Promise.all(queries);

    // Record the export in audit log
    await prisma.auditLog.create({
        data: {
            workspaceId: params.id,
            userId: user.id,
            action: 'workspace.exported',
            resourceType: 'workspace',
            resourceId: params.id,
            details: { format, scope },
        },
    });

    if (format === 'csv') {
        // Convert to CSV — flatten assets for CSV format
        const assets = (exportData.assets as Array<Record<string, unknown>>) || [];
        const headers = ['id', 'name', 'assetType', 'status', 'manufacturer', 'model', 'serialNumber', 'location', 'category', 'assignedTo', 'createdAt'];
        const csvRows = [headers.join(',')];

        for (const asset of assets) {
            const row = [
                asset.id,
                `"${String(asset.name || '').replace(/"/g, '""')}"`,
                asset.assetType,
                asset.status,
                `"${String(asset.manufacturer || '').replace(/"/g, '""')}"`,
                `"${String(asset.model || '').replace(/"/g, '""')}"`,
                asset.serialNumber || '',
                `"${String(asset.location || '').replace(/"/g, '""')}"`,
                `"${String((asset.category as Record<string, unknown>)?.name || '').replace(/"/g, '""')}"`,
                `"${String((asset.assignedTo as Record<string, unknown>)?.email || '').replace(/"/g, '""')}"`,
                asset.createdAt,
            ];
            csvRows.push(row.join(','));
        }

        return new Response(csvRows.join('\n'), {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="glanus-export-${params.id}-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    }

    // JSON format (default)
    return new Response(JSON.stringify(exportData, null, 2), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="glanus-export-${params.id}-${new Date().toISOString().slice(0, 10)}.json"`,
        },
    });
});
