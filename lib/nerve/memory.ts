/**
 * NERVE — Operational Memory
 * 
 * Structured query interface over historical operational data.
 * Answers: "Has this pattern occurred before?" and "What happened last time?"
 * 
 * Uses existing AuditLog, AgentMetric, and AlertRule tables.
 */

import { prisma } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────

export interface PatternMatch {
    timestamp: Date;
    description: string;
    similarity: number; // 0-1
    outcome?: string;
    relatedEvents: string[];
}

export interface IncidentTimeline {
    startedAt: Date;
    resolvedAt?: Date;
    durationMinutes: number;
    events: Array<{
        timestamp: Date;
        type: 'alert' | 'action' | 'metric' | 'change';
        description: string;
    }>;
}

// ─── Pattern Queries ─────────────────────────────────────

/**
 * Search for historical alert patterns similar to a current situation.
 * Looks for past audit logs matching the same action type on similar resources.
 */
export async function findSimilarPatterns(
    workspaceId: string,
    action: string,
    resourceType?: string,
    lookbackDays: number = 90,
): Promise<PatternMatch[]> {
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    const historicalEvents = await prisma.auditLog.findMany({
        where: {
            workspaceId,
            action: { contains: action.split('.')[0] }, // Match action family
            createdAt: {
                gte: lookbackDate,
                lt: new Date(Date.now() - 60 * 60 * 1000), // Exclude last hour
            },
            ...(resourceType ? { resourceType } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
            id: true,
            action: true,
            resourceType: true,
            resourceId: true,
            createdAt: true,
            details: true,
            user: { select: { name: true } },
        },
    });

    return historicalEvents.map(event => {
        // Simple similarity: exact action match = 1.0, family match = 0.7
        const similarity = event.action === action ? 1.0
            : event.action.startsWith(action.split('.')[0]) ? 0.7
                : 0.4;

        return {
            timestamp: event.createdAt,
            description: `${event.action} on ${event.resourceType || 'resource'} by ${event.user?.name || 'system'}`,
            similarity,
            relatedEvents: [event.id],
        };
    });
}

/**
 * Build a timeline of events around a specific incident point.
 * Looks 30 minutes before and after the incident.
 */
export async function buildIncidentTimeline(
    workspaceId: string,
    incidentTime: Date,
    windowMinutes: number = 30,
): Promise<IncidentTimeline> {
    const start = new Date(incidentTime.getTime() - windowMinutes * 60 * 1000);
    const end = new Date(incidentTime.getTime() + windowMinutes * 60 * 1000);

    const [auditEvents, metricSpikes] = await Promise.all([
        // Audit trail around the incident
        prisma.auditLog.findMany({
            where: {
                workspaceId,
                createdAt: { gte: start, lte: end },
            },
            orderBy: { createdAt: 'asc' },
            select: {
                action: true,
                resourceType: true,
                createdAt: true,
                user: { select: { name: true } },
            },
        }),

        // Script executions around the incident
        prisma.scriptExecution.findMany({
            where: {
                workspaceId,
                createdAt: { gte: start, lte: end },
            },
            orderBy: { createdAt: 'asc' },
            select: {
                scriptName: true,
                status: true,
                createdAt: true,
            },
        }),
    ]);

    const events: IncidentTimeline['events'] = [];

    for (const event of auditEvents) {
        events.push({
            timestamp: event.createdAt,
            type: event.action.includes('alert') ? 'alert' : 'change',
            description: `${event.action}${event.resourceType ? ` (${event.resourceType})` : ''} — ${event.user?.name || 'system'}`,
        });
    }

    for (const script of metricSpikes) {
        events.push({
            timestamp: script.createdAt,
            type: 'action',
            description: `Script "${script.scriptName}" — ${script.status}`,
        });
    }

    // Sort chronologically
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const durationMinutes = events.length >= 2
        ? Math.round((events[events.length - 1].timestamp.getTime() - events[0].timestamp.getTime()) / 60000)
        : 0;

    return {
        startedAt: start,
        resolvedAt: end,
        durationMinutes,
        events,
    };
}

/**
 * Get metric trend for an agent over a time window.
 * Used for spotting gradual degradation patterns.
 */
export async function getMetricTrend(
    agentId: string,
    metric: 'cpu' | 'ram' | 'disk',
    hoursBack: number = 24,
): Promise<Array<{ timestamp: Date; value: number }>> {
    const since = new Date();
    since.setHours(since.getHours() - hoursBack);

    const field = metric === 'cpu' ? 'cpuUsage'
        : metric === 'ram' ? 'ramUsage'
            : 'diskUsage';

    const metrics = await prisma.agentMetric.findMany({
        where: {
            agentId,
            timestamp: { gte: since },
        },
        orderBy: { timestamp: 'asc' },
        select: {
            timestamp: true,
            [field]: true,
        },
    });

    return metrics.map(m => ({
        timestamp: m.timestamp,
        value: (m as Record<string, unknown>)[field] as number,
    }));
}
