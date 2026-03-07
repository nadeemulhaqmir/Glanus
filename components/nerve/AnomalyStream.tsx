'use client';

import { useState, useEffect } from 'react';
import { csrfFetch } from '@/lib/api/csrfFetch';
import type { EnrichedMetric } from '@/lib/nerve/enrichment';

export function AnomalyStream({ workspaceId }: { workspaceId: string }) {
    const [metrics, setMetrics] = useState<EnrichedMetric[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNerveData = async () => {
            setLoading(true);
            try {
                const res = await csrfFetch(`/api/workspaces/${workspaceId}/intelligence/nerve`);
                if (res.ok) {
                    const data = await res.json();
                    // Filter to only agents with either deviations or recent changes
                    const streams = (data.data?.metrics || []).filter((m: EnrichedMetric) =>
                        m.deviations?.length > 0 || m.recentChanges?.length > 0
                    );
                    setMetrics(streams);
                }
            } catch (err) {
                console.error('Failed to fetch NERVE data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (workspaceId) {
            fetchNerveData();
            // Ping every 30 seconds for live streaming feel
            const interval = setInterval(fetchNerveData, 30000);
            return () => clearInterval(interval);
        }
    }, [workspaceId]);

    const getDeviationColor = (sev: string) => {
        if (sev === 'critical') return 'text-health-critical bg-health-critical/10 border-health-critical/20';
        if (sev === 'high') return 'text-oracle bg-oracle/10 border-oracle/20';
        if (sev === 'elevated') return 'text-nerve bg-nerve/10 border-nerve/20';
        return 'text-muted-foreground bg-surface-1 border-border';
    };

    if (loading && metrics.length === 0) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 w-48 bg-surface-2 rounded-lg" />
                <div className="h-64 bg-surface-2 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nerve/10">
                        <svg className="h-4 w-4 text-nerve animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2.625L9.375 5.5l5.25 13L18.375 13H21" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">NERVE Anomaly Stream</h2>
                        <p className="text-xs text-muted-foreground">Live heartbeat telemetry & correlated changes</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-health-good opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-health-good"></span>
                    </span>
                    <span className="text-xs font-medium text-health-good">LIVE</span>
                </div>
            </div>

            {metrics.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-12 text-center">
                    <p className="text-sm font-medium text-muted-foreground">No active anomalies detected.</p>
                    <p className="mt-1 text-xs text-muted-foreground/60">All connected agents are reporting normal baseline metrics.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {metrics.map(m => (
                        <div key={m.agentId} className="card relative overflow-hidden group">
                            {m.healthScore < 50 && <div className="absolute top-0 left-0 w-1 h-full bg-health-critical" />}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-sm font-bold">{m.assetName}</h3>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        <span>Health Score: <span className={`font-bold ${m.healthScore < 50 ? 'text-health-critical' : m.healthScore < 80 ? 'text-oracle' : 'text-health-good'}`}>{m.healthScore}</span></span>
                                        <span>•</span>
                                        <span>CPU {m.cpuUsage}%</span>
                                        <span>•</span>
                                        <span>RAM {m.ramUsage}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Deviations */}
                                {m.deviations?.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Baseline Deviations</p>
                                        <div className="flex flex-col gap-1.5">
                                            {m.deviations.map((d, i) => (
                                                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded border text-xs ${getDeviationColor(d.severity)}`}>
                                                    <span className="font-semibold uppercase">{d.metric} Spike</span>
                                                    <span>+{d.deviationPercent}% over avg ({d.currentValue} &gt; {d.baselineAvg})</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Correlated Changes */}
                                {m.recentChanges?.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Correlated System Changes</p>
                                        <div className="flex flex-col gap-1.5">
                                            {m.recentChanges.map((c, i) => (
                                                <div key={i} className="flex items-start gap-2 px-3 py-2 rounded bg-surface-1 text-xs border border-border">
                                                    <span className="shrink-0 mt-0.5 text-muted-foreground">⏱</span>
                                                    <div>
                                                        <p className="font-medium text-foreground truncate">{c.action.replace(/_/g, ' ')}</p>
                                                        <p className="text-muted-foreground text-2xs truncate">by {c.actor} • {new Date(c.timestamp).toLocaleTimeString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
