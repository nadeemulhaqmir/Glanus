import { prisma } from '@/lib/db';
import { logInfo, logError } from '@/lib/logger';
import { forecastFailures } from '@/lib/oracle/predictions';

export class AlertService {
    /**
     * Executes the Oracle prediction logic against all workspaces to generate proactive AI Insights.
     * Extracts complex DB anomaly detection from the cron HTTP route.
     */
    static async evaluateOracleMatrix() {
        logInfo('[SERVICE] Orchestrating Oracle Predictions Matrix...');

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
                logError(`[SERVICE] Failed persisting insights for workspace ${workspace.id}`, insightErr);
                aiErrors++;
            }
        }

        return {
            insightsGenerated,
            aiErrors
        };
    }
}
