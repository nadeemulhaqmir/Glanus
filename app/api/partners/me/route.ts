import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { z } from 'zod';

const updatePartnerSchema = z.object({
    bio: z.string().max(1000).optional(),
    logo: z.string().url().optional().nullable(),
    coverImage: z.string().url().optional().nullable(),
    website: z.string().url().optional().nullable(),
    phone: z.string().min(10).max(20).optional(),
    serviceRadius: z.number().int().min(0).max(500).optional(),
    remoteOnly: z.boolean().optional(),
    industries: z.array(z.string()).optional(),
    certifications: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    acceptingNew: z.boolean().optional(),
});

// GET /api/partners/me - Get current user's partner profile
export const GET = withErrorHandler(async () => {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        include: {
            partnerProfile: {
                include: {
                    assignments: {
                        where: { status: { in: ['PENDING', 'ACCEPTED', 'ACTIVE'] } },
                        include: {
                            workspace: { select: { id: true, name: true, slug: true, logo: true } },
                        },
                    },
                    examsCompleted: true,
                    payouts: { orderBy: { createdAt: 'desc' }, take: 10 },
                    _count: { select: { assignments: true } },
                },
            },
        },
    });

    if (!dbUser || !dbUser.partnerProfile) {
        return apiError(404, 'Partner profile not found');
    }

    return apiSuccess({ partner: dbUser.partnerProfile });
});

// PATCH /api/partners/me - Update partner profile
export const PATCH = withErrorHandler(async (request: Request) => {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        include: { partnerProfile: true },
    });

    if (!dbUser || !dbUser.partnerProfile) {
        return apiError(404, 'Partner profile not found');
    }

    const body = await request.json();
    const validation = updatePartnerSchema.safeParse(body);
    if (!validation.success) {
        return apiError(400, 'Validation failed', validation.error.errors);
    }

    const updatedPartner = await prisma.partner.update({
        where: { id: dbUser.partnerProfile.id },
        data: validation.data,
    });

    return apiSuccess({ partner: updatedPartner });
});
