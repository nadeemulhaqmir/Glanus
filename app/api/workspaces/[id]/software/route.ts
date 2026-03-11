import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceRole } from '@/lib/api/withAuth';
import { apiError, apiSuccess } from '@/lib/api/response';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const workspaceId = params.id;
        const user = await requireAuth();
        await requireWorkspaceRole(workspaceId, user.id, 'VIEWER');

        // Aggregation: Get unique software across the workspace fleet.
        const softwareList = await prisma.$queryRaw`
            SELECT 
                s.name, 
                s.version, 
                s.publisher, 
                CAST(COUNT(DISTINCT s."agentId") AS INTEGER) as "installCount"
            FROM "InstalledSoftware" s
            JOIN "AgentConnection" a ON s."agentId" = a.id
            WHERE a."workspaceId" = ${workspaceId}
            GROUP BY s.name, s.version, s.publisher
            ORDER BY "installCount" DESC, s.name ASC
        `;

        return apiSuccess({ software: softwareList });
    } catch (error) {
        logError('Error fetching software inventory for workspace', error);
        return apiError(500, 'Failed to fetch software inventory');
    }
}
