import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/lib/api/withAuth';
import crypto from 'crypto';
import { ScriptScheduleService } from '@/lib/services/ScriptScheduleService';

function verifyCronAuth(request: NextRequest): boolean {
    const cronSecret = request.headers.get('Authorization');
    const expectedSecret = process.env.CRON_SECRET;
    const expectedValue = `Bearer ${expectedSecret}`;
    return !!(expectedSecret && cronSecret &&
        cronSecret.length === expectedValue.length &&
        crypto.timingSafeEqual(Buffer.from(cronSecret), Buffer.from(expectedValue)));
}

/**
 * POST /api/cron/scripts
 * Background job to process scheduled scripts.
 * Protected by CRON_SECRET bearer token (timing-safe comparison).
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
    if (!verifyCronAuth(request)) return apiError(401, 'Unauthorized');
    const stats = await ScriptScheduleService.evaluateSchedules();
    return apiSuccess({ success: true, stats, timestamp: new Date().toISOString() });
});

/**
 * GET /api/cron/scripts
 * Get cron job status/info (for debugging).
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    if (!verifyCronAuth(request)) return apiError(401, 'Unauthorized');
    const status = await ScriptScheduleService.getCronStatus();
    return apiSuccess({ ...status, timestamp: new Date().toISOString() });
});
