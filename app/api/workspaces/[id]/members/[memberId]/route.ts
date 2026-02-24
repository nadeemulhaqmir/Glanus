import { apiSuccess, apiError } from '@/lib/api/response';
import { logError } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/sendgrid';
import { getRoleChangedEmailTemplate, getMemberRemovedEmailTemplate } from '@/lib/email/templates';
import { auditLog } from '@/lib/workspace/auditLog';

const updateRoleSchema = z.object({
    role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

// PATCH /api/workspaces/[id]/members/[memberId] - Update member role
export const PATCH = withErrorHandler(async (
    request: Request,
    context: { params: Promise<{ id: string; memberId: string }> }
) => {
    const { id: workspaceId, memberId } = await context.params;
    const user = await requireAuth();
    const { workspace } = await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    // Validate request body
    const body = await request.json();
    const validation = updateRoleSchema.safeParse(body);
    if (!validation.success) {
        return apiError(400, 'Validation failed', validation.error.errors);
    }

    // Cannot change owner's role
    if (memberId === 'owner') {
        return apiError(400, 'Cannot change owner role');
    }

    // Get target member before update
    const targetMember = await prisma.workspaceMember.findUnique({
        where: { id: memberId },
        include: { user: { select: { name: true, email: true } } },
    });

    const oldRole = targetMember?.role || 'MEMBER';

    const updatedMember = await prisma.workspaceMember.update({
        where: { id: memberId },
        data: { role: validation.data.role },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });

    // Send role changed email (non-blocking)
    try {
        await sendEmail({
            to: updatedMember.user.email,
            subject: `Your role in ${workspace.name} has been updated`,
            html: getRoleChangedEmailTemplate(
                updatedMember.user.name || updatedMember.user.email,
                oldRole,
                validation.data.role,
                workspace.name
            ),
        });
    } catch (emailError) {
        logError('Failed to send role change email', emailError);
    }

    await auditLog({
        workspaceId,
        userId: user.id,
        action: 'member.role_changed',
        resourceType: 'WorkspaceMember',
        resourceId: memberId,
        details: { oldRole, newRole: validation.data.role },
    });

    return apiSuccess({ member: updatedMember });
});

// DELETE /api/workspaces/[id]/members/[memberId] - Remove member
export const DELETE = withErrorHandler(async (
    _request: Request,
    context: { params: Promise<{ id: string; memberId: string }> }
) => {
    const { id: workspaceId, memberId } = await context.params;
    const user = await requireAuth();
    const { workspace } = await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    // Cannot remove owner
    if (memberId === 'owner') {
        return apiError(400, 'Cannot remove owner from workspace');
    }

    // Get member info before deletion for email
    const memberToRemove = await prisma.workspaceMember.findUnique({
        where: { id: memberId },
        include: { user: { select: { name: true, email: true } } },
    });

    await prisma.workspaceMember.delete({ where: { id: memberId } });

    // Send removal notification email (non-blocking)
    if (memberToRemove) {
        try {
            await sendEmail({
                to: memberToRemove.user.email,
                subject: `You've been removed from ${workspace.name}`,
                html: getMemberRemovedEmailTemplate(
                    memberToRemove.user.name || memberToRemove.user.email,
                    workspace.name
                ),
            });
        } catch (emailError) {
            logError('Failed to send removal email', emailError);
        }
    }

    await auditLog({
        workspaceId,
        userId: user.id,
        action: 'member.removed',
        resourceType: 'WorkspaceMember',
        resourceId: memberId,
        details: { removedUser: memberToRemove?.user?.email },
    });

    return apiSuccess({ message: 'Member removed' });
});
