import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess, withErrorHandler } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/response';

export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(workspaceId, user.id);

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const include = searchParams.get('type') || 'asset_inventory';

    if (format !== 'csv') {
        return apiError(400, 'Currently only CSV format is supported for reports.');
    }

    // --- Asset Inventory Report ---
    if (include === 'asset_inventory') {
        const assets = await prisma.asset.findMany({
            where: { workspaceId },
            include: {
                category: true,
                physicalAsset: true,
                digitalAsset: true,
                agentConnection: {
                    select: {
                        status: true,
                        updatedAt: true,
                        platform: true,
                        metrics: {
                            orderBy: { timestamp: 'desc' },
                            take: 1
                        }
                    }
                },
                aiInsights: {
                    where: { type: 'failure_forecast' },
                    orderBy: { severity: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        const headers = [
            'Asset ID,Name,Category,Type,Status,Serial Number,Location,Agent Status,Last Seen,OS Platform,CPU Usage (%),RAM Usage (%),Disk Usage (%),Active ORACLE Forecast,Created At'
        ].join('\n');

        const rows = assets.map((asset: any) => {
            const agent = asset.agentConnection;
            const latestMetric = agent?.metrics?.[0];
            const forecast = asset.aiInsights[0];

            let cpuUsage = 'N/A';
            let ramUsage = 'N/A';
            let diskUsage = 'N/A';

            if (latestMetric?.cpuUsage !== undefined) {
                cpuUsage = latestMetric.cpuUsage.toFixed(1);
            }
            if (latestMetric?.ramUsed !== undefined && latestMetric?.ramTotal) {
                ramUsage = ((latestMetric.ramUsed / latestMetric.ramTotal) * 100).toFixed(1);
            }
            if (latestMetric?.diskUsed !== undefined && latestMetric?.diskTotal) {
                diskUsage = ((latestMetric.diskUsed / latestMetric.diskTotal) * 100).toFixed(1);
            }

            const categoryName = asset.category?.name
                || asset.physicalAsset?.category
                || asset.digitalAsset?.category
                || 'Uncategorized';

            return [
                asset.id,
                `"${asset.name}"`,
                categoryName,
                asset.assetType,
                asset.status,
                `"${asset.serialNumber || 'N/A'}"`,
                `"${asset.location || 'N/A'}"`,
                agent?.status || 'UNMANAGED',
                agent?.updatedAt ? agent.updatedAt.toISOString() : 'Never',
                agent?.platform || 'Unknown',
                cpuUsage,
                ramUsage,
                diskUsage,
                `"${forecast ? `${forecast.severity} Risk: ${forecast.title}` : 'Normal'}"`,
                asset.createdAt.toISOString()
            ].join(',');
        });

        return new Response([headers, ...rows].join('\n'), {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="glanus-inventory-${workspaceId}-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    }

    // --- RMM Health & Uptime ---
    if (include === 'rmm_health') {
        const agents = await prisma.agentConnection.findMany({
            where: { workspaceId },
            include: {
                asset: { select: { name: true } },
                scripts: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            },
            orderBy: { lastSeen: 'desc' }
        });

        const headers = [
            'Agent ID,Linked Asset,Platform,Agent Version,Status,Last Seen,CPU (Lates),RAM (Latest),Recent Script Execution,Script Status'
        ].join('\n');

        const rows = agents.map((agent: any) => {
            const latestScript = agent.scripts[0];

            return [
                agent.id,
                `"${agent.asset.name}"`,
                agent.platform,
                agent.agentVersion,
                agent.status,
                agent.lastSeen.toISOString(),
                agent.cpuUsage?.toFixed(1) || 'N/A',
                agent.ramUsage?.toFixed(1) || 'N/A',
                `"${latestScript?.scriptName || 'None'}"`,
                latestScript?.status || 'N/A'
            ].join(',');
        });

        return new Response([headers, ...rows].join('\n'), {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="glanus-rmm-health-${workspaceId}-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    }

    // --- AI CORTEX Insights ---
    if (include === 'cortex_insights') {
        const insights = await prisma.aIInsight.findMany({
            where: { workspaceId },
            include: {
                asset: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const headers = [
            'Insight ID,Linked Asset,Type,Severity,Confidence,Title,Description,Status,Created At'
        ].join('\n');

        const rows = insights.map((i: any) => {
            return [
                i.id,
                `"${i.asset?.name || 'Workspace Level'}"`,
                i.type,
                i.severity || 'INFO',
                i.confidence ? `${(i.confidence * 100).toFixed(0)}%` : 'N/A',
                `"${i.title}"`,
                `"${i.description}"`,
                i.acknowledged ? 'RESOLVED' : 'ACTIVE',
                i.createdAt.toISOString()
            ].join(',');
        });

        return new Response([headers, ...rows].join('\n'), {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="glanus-cortex-insights-${workspaceId}-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    }

    return apiError(400, `Unknown report type: ${include}`);
});
