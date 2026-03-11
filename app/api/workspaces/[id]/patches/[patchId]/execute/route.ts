import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { PatchService } from '@/lib/services/PatchService';

export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string; patchId: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'ADMIN');

    try {
        const { executedCount } = await PatchService.executePatchPolicy(
            params.id,
            params.patchId,
            user.id
        );

        if (executedCount === 0) {
            return apiSuccess({ count: 0 }, { message: 'No endpoints found requiring this patch.' });
        }

        return apiSuccess({ count: executedCount }, { message: `Successfully deployed patch to ${executedCount} vulnerable endpoints.` });
    } catch (error: any) {
        if (error.message.includes('not found')) {
            return apiError(404, error.message);
        }
        if (error.message.includes('disabled')) {
            return apiError(400, error.message);
        }
        return apiError(500, 'Failed to deploy patch policy');
    }
});
