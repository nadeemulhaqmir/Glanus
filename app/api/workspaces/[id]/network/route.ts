import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        const params = await (context.params instanceof Promise ? context.params : Promise.resolve(context.params));

        // The middleware wrapper throws errors on validation failure
        await requireWorkspaceAccess(params.id, user.id, request);

        const devices = await prisma.networkDevice.findMany({
            where: { workspaceId: params.id },
            orderBy: { lastSeen: 'desc' },
            include: {
                discoveredBy: {
                    select: {
                        hostname: true,
                        platform: true
                    }
                }
            }
        });

        const scans = await prisma.discoveryScan.findMany({
            where: { workspaceId: params.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                agent: {
                    select: {
                        hostname: true
                    }
                }
            }
        });

        return apiSuccess({ devices, recentScans: scans });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return apiError(403, 'Unauthorized');
        return apiError(500, 'Failed to retrieve network topology', error.message);
    }
}
