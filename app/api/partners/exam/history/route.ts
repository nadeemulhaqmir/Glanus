import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';

// GET /api/partners/exam/history - Get exam history
export const GET = withErrorHandler(async () => {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        include: { partnerProfile: true },
    });

    if (!dbUser || !dbUser.partnerProfile) {
        return apiError(404, 'Partner profile not found');
    }

    const exams = await prisma.partnerExam.findMany({
        where: { partnerId: dbUser.partnerProfile.id },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, level: true, status: true, score: true,
            passingScore: true, startedAt: true, completedAt: true, timeLimit: true,
        },
    });

    const byLevel = exams.reduce((acc: any, exam) => {
        if (!acc[exam.level]) acc[exam.level] = [];
        acc[exam.level].push(exam);
        return acc;
    }, {});

    return apiSuccess({
        exams,
        byLevel,
        summary: {
            totalAttempts: exams.length,
            passed: exams.filter(e => e.status === 'PASSED').length,
            failed: exams.filter(e => e.status === 'FAILED').length,
            inProgress: exams.filter(e => e.status === 'STARTED').length,
        },
    });
});
