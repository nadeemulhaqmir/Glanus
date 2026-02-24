import { apiSuccess } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess, withErrorHandler } from '@/lib/api/withAuth';

// GET /api/workspaces/[id]/members - List workspace members
export const GET = withErrorHandler(async (
    _request: Request,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    const { workspace } = await requireWorkspaceAccess(workspaceId, user.id);

    // Get all members
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                },
            },
        },
        orderBy: { joinedAt: 'asc' },
    });

    // Add owner to the list
    const owner = await prisma.user.findUnique({
        where: { id: workspace.ownerId },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
        },
    });

    const allMembers = [
        {
            id: 'owner',
            workspaceId,
            userId: workspace.ownerId,
            role: 'OWNER',
            joinedAt: workspace.createdAt,
            user: owner,
        },
        ...members,
    ];

    return apiSuccess({ members: allMembers });
});
