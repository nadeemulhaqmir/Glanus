import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';

// POST /api/partners/assignments/[id]/accept
export const POST = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id } = await context.params;
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        include: { partnerProfile: true },
    });

    if (!dbUser || !dbUser.partnerProfile) {
        return apiError(404, 'Partner profile not found');
    }

    const assignment = await prisma.partnerAssignment.findUnique({ where: { id } });
    if (!assignment) return apiError(404, 'Assignment not found');
    if (assignment.partnerId !== dbUser.partnerProfile.id) return apiError(403, 'Unauthorized');
    if (assignment.status !== 'PENDING') return apiError(400, 'Can only accept pending assignments');

    const updated = await prisma.partnerAssignment.update({
        where: { id },
        data: { status: 'ACCEPTED' },
    });

    return apiSuccess({ assignment: updated, message: 'Assignment accepted successfully' });
});
