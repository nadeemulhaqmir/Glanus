import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';

/**
 * GET /api/workspaces/[id]/search?q=<query>&limit=5
 * 
 * Unified search across workspace entities:
 *   - Assets (name, serial number, location)
 *   - Agents (hostname, IP address)
 *   - AI Insights (title, description)
 */
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(workspaceId, user.id);

    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim();
    const limit = Math.min(10, Math.max(1, parseInt(url.searchParams.get('limit') || '5')));

    if (!q || q.length < 2) {
        return apiSuccess({ assets: [], agents: [], insights: [] });
    }

    // Run all searches in parallel for speed
    const [assets, agents, insights] = await Promise.all([
        // Asset search: name, serial number, location
        prisma.asset.findMany({
            where: {
                workspaceId,
                deletedAt: null,
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { serialNumber: { contains: q, mode: 'insensitive' } },
                    { location: { contains: q, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                name: true,
                assetType: true,
                status: true,
                serialNumber: true,
                category: { select: { name: true } },
            },
            take: limit,
            orderBy: { updatedAt: 'desc' },
        }),

        // Agent search: hostname, IP, linked asset name
        prisma.agentConnection.findMany({
            where: {
                workspaceId,
                OR: [
                    { hostname: { contains: q, mode: 'insensitive' } },
                    { ipAddress: { contains: q, mode: 'insensitive' } },
                    { asset: { name: { contains: q, mode: 'insensitive' } } },
                ],
            },
            select: {
                id: true,
                hostname: true,
                platform: true,
                status: true,
                ipAddress: true,
                asset: { select: { id: true, name: true } },
            },
            take: limit,
            orderBy: { lastSeen: 'desc' },
        }),

        // AI Insight search: title, description
        prisma.aIInsight.findMany({
            where: {
                workspaceId,
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                ],
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
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    return apiSuccess({ assets, agents, insights });
});
