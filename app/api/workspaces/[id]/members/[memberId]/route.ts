import { apiSuccess } from '@/lib/api/response';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { z } from 'zod';
import { WorkspaceMemberService } from '@/lib/services/WorkspaceMemberService';

const updateRoleSchema = z.object({
    role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

// PATCH /api/workspaces/[id]/members/[memberId]
export const PATCH = withErrorHandler(async (
    request: Request,
    context: { params: Promise<{ id: string; memberId: string }> }
) => {
    const { id: workspaceId, memberId } = await context.params;
    const user = await requireAuth();
    const { workspace } = await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    const body = await request.json();
    const validation = updateRoleSchema.parse(body);

    const member = await WorkspaceMemberService.updateMemberRole(
        workspaceId, memberId, user.id, validation.role, workspace.name,
    );
    return apiSuccess({ member });
});

// DELETE /api/workspaces/[id]/members/[memberId]
export const DELETE = withErrorHandler(async (
    _request: Request,
    context: { params: Promise<{ id: string; memberId: string }> }
) => {
    const { id: workspaceId, memberId } = await context.params;
    const user = await requireAuth();
    const { workspace } = await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    await WorkspaceMemberService.removeMember(workspaceId, memberId, user.id, workspace.name);
    return apiSuccess({ message: 'Member removed' });
});
