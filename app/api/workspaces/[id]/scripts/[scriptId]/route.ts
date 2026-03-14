import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess } from '@/lib/api/response';
import { ScriptService } from '@/lib/services/ScriptService';

/**
 * GET /api/workspaces/[id]/scripts/[scriptId]
 * Fetch a single script's details and payload content
 */
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string; scriptId: string }> },
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'MEMBER');
    const script = await ScriptService.getScriptById(params.id, params.scriptId);
    return apiSuccess({ script });
});

/**
 * DELETE /api/workspaces/[id]/scripts/[scriptId]
 * Remove a script from the repository. Also nullifies execution history references.
 */
export const DELETE = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string; scriptId: string }> },
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'ADMIN');
    await ScriptService.deleteScript(params.id, params.scriptId, user.id);
    return apiSuccess(null, { message: 'Script deleted successfully' });
});
