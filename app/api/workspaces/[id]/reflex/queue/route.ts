import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { getActionQueue } from '@/lib/reflex/automation';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { verifyWorkspaceAccess } from '@/lib/workspace/permissions';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id]/reflex/queue - List historical and pending actions
export const GET = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
    const user = await requireAuth();
    const { id: workspaceId } = await context.params;

    const access = await verifyWorkspaceAccess(user.email, workspaceId);
    if (!access.allowed) {
        return apiError(403, 'Forbidden - Insufficient permissions');
    }

    try {
        const queue = await getActionQueue(workspaceId);
        return apiSuccess(queue);
    } catch (error: unknown) {
        return apiError(500, 'Failed to fetch Reflex action queue', (error as Error).message);
    }
});
