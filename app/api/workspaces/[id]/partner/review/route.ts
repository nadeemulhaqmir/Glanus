import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { verifyWorkspaceAccess, hasWorkspacePermission } from '@/lib/workspace/permissions';
import { z } from 'zod';
import { sanitizeText } from '@/lib/security/sanitize';

const reviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    review: z.string().min(20, 'Review must be at least 20 characters').max(1000),
});

// POST /api/workspaces/[id]/partner/review - Rate and review partner
export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();

    const accessResult = await verifyWorkspaceAccess(user.email, workspaceId);
    if (!accessResult.allowed) {
        return apiError(403, accessResult.error || 'Access denied');
    }

    if (!hasWorkspacePermission(accessResult!.role, 'manageMembers')) {
        return apiError(403, 'Only workspace admins can review partners');
    }

    const body = await request.json();
    const validation = reviewSchema.safeParse(body);
    if (!validation.success) {
        return apiError(400, 'Validation failed', validation.error.errors);
    }

    const { rating, review } = validation.data;

    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { partnerAssignment: true },
    });

    if (!workspace || !workspace.partnerAssignment) {
        return apiError(404, 'No partner assigned to this workspace');
    }

    const assignment = workspace.partnerAssignment;

    if (assignment.rating) {
        return apiError(409, 'Partner already reviewed. Contact support to update review.');
    }

    if (assignment.status !== 'COMPLETED') {
        return apiError(400, 'Can only review completed assignments');
    }

    const updated = await prisma.partnerAssignment.update({
        where: { id: assignment.id },
        data: {
            rating,
            review: sanitizeText(review),
            ratedAt: new Date(),
        },
    });

    // Recalculate partner average rating
    const allRatings = await prisma.partnerAssignment.findMany({
        where: { partnerId: assignment.partnerId, rating: { not: null } },
        select: { rating: true },
    });

    const totalRatings = allRatings.length;
    const averageRating = allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings;

    await prisma.partner.update({
        where: { id: assignment.partnerId },
        data: { averageRating, totalReviews: totalRatings },
    });

    return apiSuccess({
        assignment: updated,
        message: 'Review submitted successfully. Thank you for your feedback!',
    });
});
