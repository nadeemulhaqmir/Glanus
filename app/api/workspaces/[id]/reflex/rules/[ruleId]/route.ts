import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { deleteRule } from '@/lib/reflex/automation';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { verifyWorkspaceAccess } from '@/lib/workspace/permissions';

interface RouteContext {
    params: Promise<{ id: string; ruleId: string }>;
}

// DELETE /api/workspaces/[id]/reflex/rules/[ruleId] - Remove a reflexive rule
export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
    const user = await requireAuth();
    const { id: workspaceId, ruleId } = await context.params;

    const access = await verifyWorkspaceAccess(user.email, workspaceId);

    // Strict RBAC boundary
    if (!access.allowed || (access.role !== 'OWNER' && access.role !== 'ADMIN')) {
        return apiError(403, 'Forbidden - Requires Admin permissions to drop automation rules');
    }

    try {
        await deleteRule(workspaceId, ruleId);
        return apiSuccess({ deletedId: ruleId }, { message: 'Automation rule deleted successfully' }, 200);
    } catch (error: unknown) {
        return apiError(500, 'Failed to discard automation rule', (error as Error).message);
    }
});
