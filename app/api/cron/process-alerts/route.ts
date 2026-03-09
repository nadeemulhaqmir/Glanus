import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { notificationOrchestrator } from '@/lib/notification-orchestrator';
import { logInfo, logError } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { forecastFailures } from '@/lib/oracle/predictions';
import crypto from 'crypto';

/**
 * Background job endpoint to process alerts
 * 
 * This should be called:
 * 1. Via cron job (every 5 minutes) for regular alert checks
 * 2. Via manual trigger for testing
 * 
 * Security: In production, this should be protected by:
 * - Secret token in Authorization header
 * - IP whitelist (only allow from cron service)
 * - Rate limiting
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

        logInfo('[CRON] Starting alert processing...');
        const startTime = Date.now();

        // Process all workspaces
        const results = await notificationOrchestrator.processAll();

        // ---- AI Insight Persistence Engine ----
        logInfo('[CRON] Orchestrating Oracle Predictions Matrix...');

        let insightsGenerated = 0;
        let aiErrors = 0;

        // Fetch all workspaces natively to ensure Oracle evaluates environments regardless of manual alert rules
        const allWorkspaces = await prisma.workspace.findMany({ select: { id: true } });

        for (const workspace of allWorkspaces) {
            try {
                // Execute Oracle prediction logic
                const forecasts = await forecastFailures(workspace.id);

                // Filter and aggregate purely high/critical anomalies
                const criticalForecasts = forecasts.filter(f => f.severity === 'critical' || f.severity === 'high');

                for (const forecast of criticalForecasts) {

                    // Throttle duplication by checking for recent matching insights (within last 6 hours)
                    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
                    const existing = await prisma.aIInsight.findFirst({
                        where: {
                            workspaceId: workspace.id,
                            assetId: forecast.assetId,
                            type: 'CAPACITY_FORECAST',
                            createdAt: { gte: sixHoursAgo }
                        }
                    });

                    if (!existing) {
                        await prisma.aIInsight.create({
                            data: {
                                workspaceId: workspace.id,
                                assetId: forecast.assetId,
                                type: 'CAPACITY_FORECAST',
                                severity: forecast.severity.toUpperCase() as "INFO" | "WARNING" | "CRITICAL",
                                title: `Capacity Burn - ${forecast.metric.toUpperCase()}`,
                                description: `Oracle expects ${forecast.metric.toUpperCase()} exhaustion in ${forecast.timeToThreshold}.`,
                                confidence: forecast.confidence,
                                metadata: {
                                    recommendations: [
                                        `Review ${forecast.metric} resource consumption immediately.`,
                                        `Consider upgrading allocations before failure state occurs.`
                                    ]
                                }
                            }
                        });
                        insightsGenerated++;
                    }
                }
            } catch (insightErr) {
                logError(`[CRON] Failed persisting insights for workspace ${workspace.id}`, insightErr);
                aiErrors++;
            }
        }

        const duration = Date.now() - startTime;

        // Aggregate stats
        const stats = {
            workspaces: results.length,
            alertsTriggered: results.reduce((sum, r) => sum + r.alertsTriggered, 0),
            emailsSent: results.reduce((sum, r) => sum + r.emailsSent, 0),
            webhooksSent: results.reduce((sum, r) => sum + r.webhooksSent, 0),
            aiInsightsGenerated: insightsGenerated,
            errors: results.reduce((sum, r) => sum + r.errors.length, 0) + aiErrors,
            duration,
        };

        logInfo('[CRON] Alert processing complete', stats);

        // Return detailed results
        return apiSuccess({
            success: true,
            stats,
            results,
            timestamp: new Date().toISOString(),
        });
    } catch (error: unknown) {
        logError('[CRON] Alert processing error', error);
        return apiError(500, error instanceof Error ? error.message : 'Unknown error');
    }
}

// GET - Get cron job status/info (for debugging)
export async function GET(request: NextRequest) {
    try {
        // Security: require CRON_SECRET for status endpoint too
        const cronSecret = request.headers.get('Authorization');
        const expectedSecret = process.env.CRON_SECRET;
        const expectedValue = `Bearer ${expectedSecret}`;

        if (!expectedSecret || !cronSecret ||
            cronSecret.length !== expectedValue.length ||
            !crypto.timingSafeEqual(Buffer.from(cronSecret), Buffer.from(expectedValue))) {
            return apiError(401, 'Unauthorized');
        }

        // Get stats about alert system
        const [
            totalRules,
            enabledRules,
            workspacesWithAlerts,
            totalWebhooks,
        ] = await Promise.all([
            prisma.alertRule.count(),
            prisma.alertRule.count({ where: { enabled: true } }),
            prisma.workspace.count({
                where: {
                    alertRules: {
                        some: {
                            enabled: true,
                        },
                    },
                },
            }),
            prisma.notificationWebhook.count({ where: { enabled: true } }),
        ]);

        return apiSuccess({
            status: 'ready',
            alertSystem: {
                totalRules,
                enabledRules,
                workspacesWithAlerts,
                totalWebhooks,
            },
            cronInfo: {
                endpoint: '/api/cron/process-alerts',
                method: 'POST',
                recommendedInterval: '*/5 * * * *', // Every 5 minutes
                requiresAuth: !!process.env.CRON_SECRET,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error: unknown) {
        return apiError(500, error instanceof Error ? error.message : 'Unknown error');
    }
}
