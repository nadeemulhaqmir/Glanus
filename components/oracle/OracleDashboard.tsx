'use client';

import { useState, useEffect } from 'react';
import { csrfFetch } from '@/lib/api/csrfFetch';
import type { FailureForecast, CapacityIntelligence } from '@/lib/oracle/predictions';

export function OracleDashboard({ workspaceId }: { workspaceId: string }) {
    const [activeTab, setActiveTab] = useState<'failures' | 'capacity'>('failures');
    const [failures, setFailures] = useState<FailureForecast[]>([]);
    const [capacity, setCapacity] = useState<CapacityIntelligence | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOracleData = async () => {
            setLoading(true);
            try {
                const [failRes, capRes] = await Promise.all([
                    csrfFetch(`/api/workspaces/${workspaceId}/intelligence/oracle?type=failures`),
                    csrfFetch(`/api/workspaces/${workspaceId}/intelligence/oracle?type=capacity`)
                ]);

                if (failRes.ok) {
                    const fd = await failRes.json();
                    setFailures(fd.data?.forecasts || []);
                }
                if (capRes.ok) {
                    const cd = await capRes.json();
                    setCapacity(cd.data || cd);
                }
            } catch (err) {
                console.error('Failed to fetch ORACLE data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (workspaceId) fetchOracleData();
    }, [workspaceId]);

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 w-48 bg-surface-2 rounded-lg" />
                <div className="h-64 bg-surface-2 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-oracle/10">
                    <svg className="h-4 w-4 text-oracle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-lg font-semibold">ORACLE Predictions</h2>
                    <p className="text-xs text-muted-foreground">Predictive hardware failures & capacity intelligence</p>
                </div>
            </div>

            {/* Internal Tabs */}
            <div className="flex gap-1 rounded-lg bg-surface-1 p-1 w-max">
                <button type="button" onClick={() => setActiveTab('failures')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'failures' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Hardware Failure Forecasts</button>
                <button type="button" onClick={() => setActiveTab('capacity')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'capacity' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Capacity Planning</button>
            </div>

            {activeTab === 'failures' && (
                <div className="space-y-4">
                    {failures.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border py-12 text-center">
                            <p className="text-sm font-medium text-muted-foreground">No hardware failures predicted in the near horizon.</p>
                            <p className="mt-1 text-xs text-muted-foreground/60">System health is stable across all tracked assets.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {failures.map((f, i) => (
                                <div key={i} className="card border-oracle/20 bg-oracle/5 relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 h-1 w-full ${f.severity === 'critical' ? 'bg-health-critical' : f.severity === 'high' ? 'bg-oracle' : 'bg-health-good'}`} />
                                    <h3 className="text-sm font-bold truncate">{f.assetName}</h3>
                                    <p className="text-xs font-mono mt-1 text-muted-foreground">Metric: <span className="text-foreground uppercase">{f.metric}</span></p>
                                    <div className="mt-4 flex items-end justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Predicted Time-to-Failure</p>
                                            <p className={`text-xl font-bold ${f.severity === 'critical' ? 'text-health-critical' : 'text-oracle'}`}>{f.timeToThreshold}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Confidence</p>
                                            <p className="text-sm font-medium">{Math.round(f.confidence * 100)}%</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'capacity' && capacity && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {capacity.resources?.map((res, i) => (
                            <div key={i} className="card">
                                <h3 className="text-sm font-medium">{res.resource} Capacity</h3>
                                <div className="mt-2 text-2xl font-bold">{res.percentUsed}% <span className="text-sm font-normal text-muted-foreground">used</span></div>
                                <div className="mt-4 w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                                    <div className={`h-full ${res.status === 'critical' ? 'bg-health-critical' : res.status === 'warning' ? 'bg-oracle' : 'bg-health-good'}`} style={{ width: `${res.percentUsed}%` }} />
                                </div>
                                <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                                    <span>{res.used} / {res.total} allocated</span>
                                    {res.daysUntilFull && <span>Full in {res.daysUntilFull} days</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                    {capacity.recommendations?.length > 0 && (
                        <div className="card bg-surface-1">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Capacity Recommendations</h4>
                            <ul className="space-y-2">
                                {capacity.recommendations.map((rec, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                        <span className="text-oracle shrink-0 mt-0.5">↳</span>
                                        <span>{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
