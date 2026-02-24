import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, withErrorHandler } from '@/lib/api/withAuth';

// GET /api/admin/partners - Admin partner management (pending approvals, all partners)
export const GET = withErrorHandler(async (request: NextRequest) => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING, VERIFIED, ACTIVE, SUSPENDED, BANNED
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) {
        where.status = status;
    }

    // Get partners with user info
    const [partners, total] = await Promise.all([
        prisma.partner.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        createdAt: true,
                    },
                },
                assignments: {
                    select: {
                        status: true,
                        workspace: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        assignments: true,
                        examsCompleted: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.partner.count({ where }),
    ]);

    // Stats
    const stats = await prisma.partner.groupBy({
        by: ['status'],
        _count: true,
    });

    return apiSuccess({
        partners,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        stats: stats.reduce((acc: any, s) => {
            acc[s.status] = s._count;
            return acc;
        }, {}),
    });
});
