import { apiSuccess } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { withRateLimit } from '@/lib/security/rateLimit';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { z } from 'zod';
import { PartnerExamService } from '@/lib/services/PartnerExamService';

const startExamSchema = z.object({
    level: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']),
});

// POST /api/partners/exam/start
export const POST = withErrorHandler(async (request: NextRequest) => {
    const rateLimitResponse = await withRateLimit(request, 'strict-api');
    if (rateLimitResponse) return rateLimitResponse;

    const user = await requireAuth();
    const body = await request.json();
    const validation = startExamSchema.parse(body)

    const result = await PartnerExamService.startExam(user.email!, validation.level);
    return apiSuccess(result);
});
