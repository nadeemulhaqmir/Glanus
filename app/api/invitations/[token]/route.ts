import { apiSuccess, apiError } from '@/lib/api/response';
import { withErrorHandler } from '@/lib/api/withAuth';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

/**
 * GET /api/invitations/[token] — Verify and retrieve invitation details
 * Used by the invitation page to show invitation info before accept.
 */
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ token: string }> }
) => {
    const { token } = await context.params;

    const invitation = await prisma.workspaceInvitation.findUnique({
        where: { token },
        include: {
            workspace: {
                select: { id: true, name: true },
            },
            inviter: {
                select: { id: true, name: true, email: true },
            },
        },
    });

    if (!invitation) {
        return apiError(404, 'Invitation not found or has expired');
    }

    if (invitation.status !== 'PENDING') {
        return apiError(400, `Invitation has already been ${invitation.status.toLowerCase()}`);
    }

    if (new Date() > invitation.expiresAt) {
        await prisma.workspaceInvitation.update({
            where: { id: invitation.id },
            data: { status: 'EXPIRED' },
        });
        return apiError(400, 'This invitation has expired');
    }

    return apiSuccess({
        invitation: {
            email: invitation.email,
            role: invitation.role,
            workspace: invitation.workspace,
            inviter: invitation.inviter,
            expiresAt: invitation.expiresAt,
        },
    });
});

