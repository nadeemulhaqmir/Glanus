import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { verifyWorkspaceAccess, hasWorkspacePermission } from '@/lib/workspace/permissions';

// DELETE /api/workspaces/[id]/partner - Remove partner from workspace
export const DELETE = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();

    const accessResult = await verifyWorkspaceAccess(user.email, workspaceId);
    if (!accessResult.allowed) {
        return apiError(403, accessResult.error || 'Access denied');
    }

    if (!hasWorkspacePermission(accessResult!.role, 'manageMembers')) {
        return apiError(403, 'Only workspace admins can remove partners');
    }

    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { partnerAssignment: true },
    });

    if (!workspace) {
        return apiError(404, 'Workspace not found');
    }

    if (!workspace.partnerAssignment) {
        return apiError(404, 'No partner assigned to this workspace');
    }

    const assignment = workspace.partnerAssignment;

    if (assignment.status === 'COMPLETED') {
        return apiError(400, 'Cannot remove completed partner assignments (kept for records)');
    }

    await prisma.$transaction(async (tx) => {
        if (assignment.status === 'ACCEPTED' || assignment.status === 'ACTIVE') {
            await tx.partner.update({
                where: { id: assignment.partnerId },
                data: { availableSlots: { increment: 1 } },
            });
        }

        await tx.partnerAssignment.delete({
            where: { id: assignment.id },
        });
    });

    return apiSuccess({ message: 'Partner removed successfully' });
});
