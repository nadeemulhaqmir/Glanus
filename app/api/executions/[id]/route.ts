import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/executions/{id}
 * Poll execution status
 */
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    await requireAuth();
    const { id } = await context.params;

    const execution = await prisma.assetActionExecution.findUnique({
        where: { id },
        include: {
            asset: {
                select: {
                    id: true,
                    name: true,
                },
            },
            actionDefinition: {
                select: {
                    name: true,
                    label: true,
                    actionType: true,
                },
            },
        },
    });

    if (!execution) {
        return apiError(404, 'Execution not found');
    }

    return apiSuccess(execution);
});
