import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/security/rateLimit';
import { bulkOpsSchema } from '@/lib/schemas/asset.schemas';

// POST /api/assets/bulk - Bulk operations on assets
export const POST = withErrorHandler(async (request: NextRequest) => {
    const rateLimitResponse = await withRateLimit(request, 'strict-api');
    if (rateLimitResponse) return rateLimitResponse;

    const user = await requireAuth();

    const body = await request.json();
    const parsed = bulkOpsSchema.safeParse(body);
    if (!parsed.success) {
        return apiError(400, parsed.error.errors[0].message);
    }
    const { operation, assetIds, data } = parsed.data;

    const assets = await prisma.asset.findMany({
        where: { id: { in: assetIds } },
    });
    if (assets.length !== assetIds.length) {
        return apiError(404, 'One or more assets not found');
    }

    let result;

    switch (operation) {
        case 'DELETE':
            result = await prisma.asset.deleteMany({
                where: { id: { in: assetIds } },
            });
            return apiSuccess({
                message: `${result.count} asset(s) deleted successfully`,
                count: result.count,
            });

        case 'UPDATE':
            if (!data) {
                return apiError(400, 'Update operation requires data');
            }
            const updateData: any = {};
            if (data.status) updateData.status = data.status;
            if (data.location) updateData.location = data.location;

            result = await prisma.asset.updateMany({
                where: { id: { in: assetIds } },
                data: updateData,
            });
            return apiSuccess({
                message: `${result.count} asset(s) updated successfully`,
                count: result.count,
            });

        case 'ASSIGN':
            if (!data?.assigneeId) {
                return apiError(400, 'Assign operation requires assigneeId');
            }
            const assigneeId = data.assigneeId;
            const assignee = await prisma.user.findUnique({
                where: { id: assigneeId },
            });
            if (!assignee) {
                return apiError(404, 'Assignee not found');
            }

            await prisma.$transaction(async (tx) => {
                await tx.asset.updateMany({
                    where: { id: { in: assetIds } },
                    data: { status: 'ASSIGNED' },
                });
                await tx.assignmentHistory.createMany({
                    data: assetIds.map((assetId: string) => ({
                        assetId,
                        userId: assigneeId,
                        assignedAt: new Date(),
                    })),
                });
            });

            return apiSuccess({
                message: `${assetIds.length} asset(s) assigned to ${assignee.name || assignee.email}`,
                count: assetIds.length,
            });

        default:
            return apiError(400, `Unknown operation: ${operation}`);
    }
});
