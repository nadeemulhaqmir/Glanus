import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { verifyWorkspaceAccess, hasWorkspacePermission } from '@/lib/workspace/permissions';
import { Prisma } from '@prisma/client';

export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();

    const accessResult = await verifyWorkspaceAccess(user.email, workspaceId);
    if (!accessResult.allowed) {
        return apiError(403, accessResult.error || 'Access denied');
    }

    if (!hasWorkspacePermission(accessResult!.role, 'manageSettings')) {
        return apiError(403, 'Permission denied. Must be an admin or owner to view audit logs.');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const assetId = searchParams.get('assetId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Prisma.AuditLogWhereInput = {
        workspaceId,
    };

    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (resourceType) where.resourceType = resourceType;
    if (assetId) where.assetId = assetId;
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            (where.createdAt as Prisma.DateTimeFilter).lte = end;
        }
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                asset: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        }),
        prisma.auditLog.count({ where }),
    ]);

    return apiSuccess({
        logs,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
});
