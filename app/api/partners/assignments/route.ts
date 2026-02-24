import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';

// GET /api/partners/assignments - List partner assignments
export const GET = withErrorHandler(async () => {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        include: { partnerProfile: true },
    });

    if (!dbUser || !dbUser.partnerProfile) {
        return apiError(404, 'Partner profile not found');
    }

    const assignments = await prisma.partnerAssignment.findMany({
        where: { partnerId: dbUser.partnerProfile.id },
        include: {
            workspace: {
                select: { id: true, name: true, slug: true, logo: true },
            },
        },
        orderBy: { assignedAt: 'desc' },
    });

    return apiSuccess({ assignments });
});
