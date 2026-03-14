/**
 * WorkspaceSearchService — Unified cross-entity search for a workspace.
 *
 * Responsibilities:
 *  - search: full-text query across assets, agent connections, and AI insights
 *
 * Designed to be extended: add new entity types by adding a parallel Prisma query.
 */
import { prisma } from '@/lib/db';

export class WorkspaceSearchService {
    /**
     * Search assets, agents, and AI insights in a workspace.
     * Returns up to `limit` results per entity type (capped at 10).
     */
    static async search(workspaceId: string, q: string, limit = 5) {
        const cap = Math.min(10, Math.max(1, limit));

        if (!q || q.trim().length < 2) {
            return { assets: [], agents: [], insights: [] };
        }

        const query = q.trim();

        const [assets, agents, insights] = await Promise.all([
            prisma.asset.findMany({
                where: {
                    workspaceId, deletedAt: null,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { serialNumber: { contains: query, mode: 'insensitive' } },
                        { location: { contains: query, mode: 'insensitive' } },
                    ],
                },
                select: {
                    id: true, name: true, assetType: true, status: true, serialNumber: true,
                    category: { select: { name: true } },
                },
                take: cap, orderBy: { updatedAt: 'desc' },
            }),
            prisma.agentConnection.findMany({
                where: {
                    workspaceId,
                    OR: [
                        { hostname: { contains: query, mode: 'insensitive' } },
                        { ipAddress: { contains: query, mode: 'insensitive' } },
                        { asset: { name: { contains: query, mode: 'insensitive' } } },
                    ],
                },
                select: {
                    id: true, hostname: true, platform: true, status: true, ipAddress: true,
                    asset: { select: { id: true, name: true } },
                },
                take: cap, orderBy: { lastSeen: 'desc' },
            }),
            prisma.aIInsight.findMany({
                where: {
                    workspaceId,
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                },
                select: {
                    id: true, title: true, type: true, severity: true, confidence: true,
                    acknowledged: true, createdAt: true,
                    asset: { select: { id: true, name: true } },
                },
                take: cap, orderBy: { createdAt: 'desc' },
            }),
        ]);

        return { assets, agents, insights };
    }
}
