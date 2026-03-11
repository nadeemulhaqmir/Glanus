import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { logError } from '@/lib/logger';
import crypto from 'crypto';
import { ScriptService } from '@/lib/services/ScriptService';

/**
 * Background job endpoint to process scheduled scripts
 * 
 * This should be called:
 * 1. Via cron job (e.g., every minute) for executing due script schedules
 * 
 * Security: In production, this should be protected by:
 * - Secret token in Authorization header
 * - IP whitelist (only allow from cron service)
 */
export async function POST(request: NextRequest) {
    try {
        // Security check: verify cron secret (ALWAYS required)
        const cronSecret = request.headers.get('Authorization');
        const expectedSecret = process.env.CRON_SECRET;
        const expectedValue = `Bearer ${expectedSecret}`;

        if (!expectedSecret || !cronSecret ||
            cronSecret.length !== expectedValue.length ||
            !crypto.timingSafeEqual(Buffer.from(cronSecret), Buffer.from(expectedValue))) {
            return apiError(401, 'Unauthorized');
        }

        const stats = await ScriptService.evaluateSchedules();

        return apiSuccess({
            success: true,
            stats,
            timestamp: new Date().toISOString(),
        });

    } catch (error: unknown) {
        logError('[CRON] Script scheduler critical error', error);
        return apiError(500, error instanceof Error ? error.message : 'Unknown error');
    }
}

// GET - Get cron job status/info (for debugging)
export async function GET(request: NextRequest) {
    try {
        const cronSecret = request.headers.get('Authorization');
        const expectedSecret = process.env.CRON_SECRET;
        const expectedValue = `Bearer ${expectedSecret}`;

        if (!expectedSecret || !cronSecret ||
            cronSecret.length !== expectedValue.length ||
            !crypto.timingSafeEqual(Buffer.from(cronSecret), Buffer.from(expectedValue))) {
            return apiError(401, 'Unauthorized');
        }

        const stats = await prisma.scriptSchedule.aggregate({
            _count: {
                id: true,
            },
            where: {
                enabled: true
            }
        });

        return apiSuccess({
            status: 'ready',
            activeSchedules: stats._count.id,
            cronInfo: {
                endpoint: '/api/cron/scripts',
                method: 'POST',
                recommendedInterval: '* * * * *', // Every minute
                requiresAuth: !!process.env.CRON_SECRET,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error: unknown) {
        return apiError(500, error instanceof Error ? error.message : 'Unknown error');
    }
}
