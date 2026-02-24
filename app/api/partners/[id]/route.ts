import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withErrorHandler } from '@/lib/api/withAuth';

// GET /api/partners/[id] - Get public partner profile
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    // Get partner with public info only
    const partner = await prisma.partner.findUnique({
        where: { id: params.id },
        select: {
            id: true,
            status: true,
            companyName: true,
            bio: true,
            logo: true,
            coverImage: true,
            website: true,
            phone: true,
            certificationLevel: true,
            certifiedAt: true,
            city: true,
            region: true,
            country: true,
            timezone: true,
            serviceRadius: true,
            remoteOnly: true,
            industries: true,
            certifications: true,
            languages: true,
            averageRating: true,
            totalReviews: true,
            maxWorkspaces: true,
            availableSlots: true,
            acceptingNew: true,
            createdAt: true,
            // Assignments with reviews
            assignments: {
                where: {
                    status: 'COMPLETED',
                    rating: { not: null },
                },
                select: {
                    rating: true,
                    review: true,
                    ratedAt: true,
                    completedAt: true,
                    workspace: {
                        select: {
                            name: true,
                            logo: true,
                        },
                    },
                },
                orderBy: { ratedAt: 'desc' },
                take: 10, // Latest 10 reviews
            },
        },
    });

    if (!partner) {
        return apiError(404, 'Partner not found');
    }

    // Don't show if not active
    if (partner.status !== 'ACTIVE') {
        return apiError(404, 'Partner profile not available');
    }

    // Calculate rating breakdown (5-star distribution)
    const ratings = partner.assignments.map((a) => a.rating).filter((r) => r !== null);
    const ratingBreakdown = {
        5: ratings.filter((r) => r === 5).length,
        4: ratings.filter((r) => r === 4).length,
        3: ratings.filter((r) => r === 3).length,
        2: ratings.filter((r) => r === 2).length,
        1: ratings.filter((r) => r === 1).length,
    };

    return apiSuccess({
        partner,
        ratingBreakdown,
    });
});
