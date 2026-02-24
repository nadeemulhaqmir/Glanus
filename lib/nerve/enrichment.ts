/**
 * NERVE — Telemetry Enrichment Pipeline
 * 
 * Enriches incoming agent heartbeat/metric data with context:
 * - Asset ownership and workspace context
 * - Baseline deviation detection
 * - Change correlation with recent audit events
 */

import { prisma } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────

export interface EnrichedMetric {
    agentId: string;
    assetId: string;
    assetName: string;
    workspaceId: string;
    timestamp: Date;

    // Raw metrics
    cpuUsage: number;
    ramUsage: number;
    diskUsage: number;

    // Enrichment context
    deviations: MetricDeviation[];
    recentChanges: RecentChange[];
    healthScore: number;
}

export interface MetricDeviation {
    metric: 'cpu' | 'ram' | 'disk';
    currentValue: number;
    baselineAvg: number;
    deviationPercent: number;
    severity: 'normal' | 'elevated' | 'high' | 'critical';
}

export interface RecentChange {
    id: string;
    action: string;
    actor: string;
    timestamp: Date;
}

// ─── Baseline Computation ────────────────────────────────

/**
 * Computes rolling 24-hour average baselines for an agent's metrics.
 */
async function computeBaselines(agentId: string): Promise<{
    cpuAvg: number;
    ramAvg: number;
    diskAvg: number;
}> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const metrics = await prisma.agentMetric.findMany({
        where: {
            agentId,
            timestamp: { gte: twentyFourHoursAgo },
        },
        select: {
            cpuUsage: true,
            ramUsage: true,
            diskUsage: true,
        },
    });

    if (metrics.length === 0) {
        return { cpuAvg: 50, ramAvg: 50, diskAvg: 50 }; // Default baselines
    }

    const sum = metrics.reduce(
        (acc, m) => ({
            cpu: acc.cpu + m.cpuUsage,
            ram: acc.ram + m.ramUsage,
            disk: acc.disk + m.diskUsage,
        }),
        { cpu: 0, ram: 0, disk: 0 }
    );

    return {
        cpuAvg: Math.round(sum.cpu / metrics.length),
        ramAvg: Math.round(sum.ram / metrics.length),
        diskAvg: Math.round(sum.disk / metrics.length),
    };
}

// ─── Deviation Detection ─────────────────────────────────

export function classifyDeviation(current: number, baseline: number): MetricDeviation['severity'] {
    if (baseline === 0) return 'normal';
    const deviation = ((current - baseline) / baseline) * 100;

    if (deviation > 100) return 'critical';
    if (deviation > 50) return 'high';
    if (deviation > 25) return 'elevated';
    return 'normal';
}

export function computeDeviations(
    cpu: number,
    ram: number,
    disk: number,
    baselines: { cpuAvg: number; ramAvg: number; diskAvg: number },
): MetricDeviation[] {
    const deviations: MetricDeviation[] = [];

    const cpuDev = baselines.cpuAvg > 0
        ? Math.round(((cpu - baselines.cpuAvg) / baselines.cpuAvg) * 100)
        : 0;
    const ramDev = baselines.ramAvg > 0
        ? Math.round(((ram - baselines.ramAvg) / baselines.ramAvg) * 100)
        : 0;
    const diskDev = baselines.diskAvg > 0
        ? Math.round(((disk - baselines.diskAvg) / baselines.diskAvg) * 100)
        : 0;

    if (cpuDev > 15) {
        deviations.push({
            metric: 'cpu',
            currentValue: cpu,
            baselineAvg: baselines.cpuAvg,
            deviationPercent: cpuDev,
            severity: classifyDeviation(cpu, baselines.cpuAvg),
        });
    }

    if (ramDev > 15) {
        deviations.push({
            metric: 'ram',
            currentValue: ram,
            baselineAvg: baselines.ramAvg,
            deviationPercent: ramDev,
            severity: classifyDeviation(ram, baselines.ramAvg),
        });
    }

    if (diskDev > 10) {
        deviations.push({
            metric: 'disk',
            currentValue: disk,
            baselineAvg: baselines.diskAvg,
            deviationPercent: diskDev,
            severity: classifyDeviation(disk, baselines.diskAvg),
        });
    }

    return deviations;
}

// ─── Health Score ─────────────────────────────────────────

export function computeHealthScore(cpu: number, ram: number, disk: number): number {
    let score = 100;

    if (cpu > 90) score -= 30;
    else if (cpu > 75) score -= 15;
    else if (cpu > 60) score -= 5;

    if (ram > 90) score -= 25;
    else if (ram > 75) score -= 10;
    else if (ram > 60) score -= 5;

    if (disk > 95) score -= 30;
    else if (disk > 85) score -= 15;
    else if (disk > 70) score -= 5;

    return Math.max(0, score);
}

// ─── Enrichment Entry Point ──────────────────────────────

/**
 * Enriches raw agent metrics with workspace context, baseline deviations,
 * and correlated recent changes. Called on each heartbeat or metric ingest.
 */
export async function enrichMetric(
    agentId: string,
    cpuUsage: number,
    ramUsage: number,
    diskUsage: number,
): Promise<EnrichedMetric | null> {
    // Get agent + asset context
    const agent = await prisma.agentConnection.findUnique({
        where: { id: agentId },
        select: {
            id: true,
            assetId: true,
            workspaceId: true,
            asset: {
                select: { id: true, name: true },
            },
        },
    });

    if (!agent || !agent.asset) return null;

    // Run enrichment steps in parallel
    const [baselines, recentLogs] = await Promise.all([
        computeBaselines(agentId),
        prisma.auditLog.findMany({
            where: {
                workspaceId: agent.workspaceId,
                createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // Last 30 min
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                action: true,
                createdAt: true,
                user: { select: { name: true, email: true } },
            },
        }),
    ]);

    const deviations = computeDeviations(cpuUsage, ramUsage, diskUsage, baselines);
    const healthScore = computeHealthScore(cpuUsage, ramUsage, diskUsage);

    const recentChanges: RecentChange[] = recentLogs.map(log => ({
        id: log.id,
        action: log.action,
        actor: log.user?.name || log.user?.email || 'System',
        timestamp: log.createdAt,
    }));

    return {
        agentId,
        assetId: agent.asset.id,
        assetName: agent.asset.name,
        workspaceId: agent.workspaceId,
        timestamp: new Date(),
        cpuUsage,
        ramUsage,
        diskUsage,
        deviations,
        recentChanges,
        healthScore,
    };
}
