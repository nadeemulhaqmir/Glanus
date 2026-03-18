/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { SystemMaintenanceService } from '@/lib/services/SystemMaintenanceService';

/**
 * POST /api/cron/cleanup
 * 
 * Scheduled job to clean up stale data:
 * - Agent metrics older than 90 days
 * - Audit logs older than 365 days
 * - Resolved alerts older than 90 days
 * 
 * Protected by CRON_SECRET bearer token.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return apiError(401, 'Unauthorized');
    }

    const results = await SystemMaintenanceService.executeDataCleanup();
    return apiSuccess(results);
});
