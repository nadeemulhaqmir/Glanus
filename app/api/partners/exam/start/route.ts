import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/security/rateLimit';
import { z } from 'zod';

const startExamSchema = z.object({
    level: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']),
});

// POST /api/partners/exam/start - Start a certification exam
export const POST = withErrorHandler(async (request: NextRequest) => {
    const rateLimitResponse = await withRateLimit(request, 'strict-api');
    if (rateLimitResponse) return rateLimitResponse;

    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        include: { partnerProfile: true },
    });

    if (!dbUser || !dbUser.partnerProfile) {
        return apiError(404, 'Partner profile not found');
    }

    const partner = dbUser.partnerProfile;
    if (partner.status !== 'ACTIVE' && partner.status !== 'VERIFIED') {
        return apiError(403, 'Partner must be verified or active to take exams');
    }

    const body = await request.json();
    const validation = startExamSchema.safeParse(body);
    if (!validation.success) {
        return apiError(400, 'Validation failed', validation.error.errors);
    }

    const { level } = validation.data;

    const activeExam = await prisma.partnerExam.findFirst({
        where: { partnerId: partner.id, status: 'STARTED' },
    });
    if (activeExam) return apiError(409, 'You already have an exam in progress');

    const passedExam = await prisma.partnerExam.findFirst({
        where: { partnerId: partner.id, level, status: 'PASSED' },
    });
    if (passedExam && partner.certificationLevel === level) {
        return apiError(409, `You are already certified at ${level} level`);
    }

    const allQuestions = await prisma.examQuestion.findMany({
        where: { level, isActive: true },
    });
    if (allQuestions.length < 20) {
        return apiError(500, `Not enough questions for ${level} exam (need 20, have ${allQuestions.length})`);
    }

    const selectedQuestions = allQuestions.sort(() => Math.random() - 0.5).slice(0, 20);

    const exam = await prisma.partnerExam.create({
        data: {
            partnerId: partner.id,
            level,
            status: 'STARTED',
            questions: selectedQuestions.map(q => q.id),
            answers: {},
            score: 0,
            passingScore: 80,
            timeLimit: 60,
        },
    });

    const questionsForExam = selectedQuestions.map((q, index) => ({
        index,
        question: q.question,
        options: q.options,
        category: q.category,
        difficulty: q.difficulty,
    }));

    return apiSuccess({
        exam: {
            id: exam.id, level: exam.level, timeLimit: exam.timeLimit,
            passingScore: exam.passingScore, startedAt: exam.startedAt,
            questionCount: selectedQuestions.length,
        },
        questions: questionsForExam,
    });
});
