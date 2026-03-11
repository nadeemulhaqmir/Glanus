import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceAccess, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { AssetStatus } from '@prisma/client';
import { z } from 'zod';

const validStatuses = Object.values(AssetStatus) as [string, ...string[]];

const bulkActionSchema = z.object({
    action: z.enum(['update_status', 'delete', 'assign', 'unassign']),
    assetIds: z.array(z.string()).min(1, 'At least one asset ID is required').max(500, 'Maximum 500 assets per batch'),
    payload: z.object({
        status: z.string().optional(),
        assignedToId: z.string().optional(),
    }).optional(),
});

/**
 * POST /api/workspaces/[id]/assets/bulk
 * Perform bulk operations on workspace assets.
 * 
 * Actions:
 *   update_status — Change status for multiple assets
 *   delete        — Permanently delete multiple assets
 *   assign        — Assign multiple assets to a user
 *   unassign      — Remove assignment from multiple assets
 */
export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(params.id, user.id);

    const body = await request.json();
    const data = bulkActionSchema.parse(body);

    // Verify all assets belong to this workspace
    const assets = await prisma.asset.findMany({
        where: {
            id: { in: data.assetIds },
            workspaceId: params.id,
        },
        select: { id: true, name: true },
    });

    if (assets.length === 0) {
        return apiError(400, 'No matching assets found in this workspace.');
    }

    const validIds = assets.map(a => a.id);
    const skipped = data.assetIds.length - validIds.length;
    let affected = 0;

    switch (data.action) {
        case 'update_status': {
            if (!data.payload?.status) {
                return apiError(400, 'status is required for update_status action.');
            }
            if (!validStatuses.includes(data.payload.status)) {
                return apiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            const result = await prisma.asset.updateMany({
                where: { id: { in: validIds } },
                data: { status: data.payload.status as AssetStatus },
            });
            affected = result.count;
            break;
        }

        case 'delete': {
            const result = await prisma.asset.deleteMany({
                where: { id: { in: validIds } },
            });
            affected = result.count;
            break;
        }

        case 'assign': {
            if (!data.payload?.assignedToId) {
                return apiError(400, 'assignedToId is required for assign action.');
            }
            // Verify the target user exists and is a workspace member
            const member = await prisma.workspaceMember.findFirst({
                where: { workspaceId: params.id, userId: data.payload.assignedToId },
            });
            if (!member) {
                return apiError(400, 'Target user is not a member of this workspace.');
            }
            const result = await prisma.asset.updateMany({
                where: { id: { in: validIds } },
                data: { assignedToId: data.payload.assignedToId },
            });
            affected = result.count;
            break;
        }

        case 'unassign': {
            const result = await prisma.asset.updateMany({
                where: { id: { in: validIds } },
                data: { assignedToId: null },
            });
            affected = result.count;
            break;
        }
    }

    // Audit log
    await prisma.auditLog.create({
        data: {
            workspaceId: params.id,
            userId: user.id,
            action: `asset.bulk_${data.action}`,
            resourceType: 'asset',
            resourceId: 'bulk',
            details: {
                action: data.action,
                requestedCount: data.assetIds.length,
                affectedCount: affected,
                skippedCount: skipped,
                assetNames: assets.slice(0, 10).map(a => a.name),
                ...(data.payload || {}),
            },
        },
    });

    return apiSuccess({
        action: data.action,
        affected,
        skipped,
        total: data.assetIds.length,
    }, { message: `Bulk ${data.action} completed: ${affected} assets affected.` });
});
