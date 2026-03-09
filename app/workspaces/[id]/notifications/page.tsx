'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { csrfFetch } from '@/lib/api/csrfFetch';
import { BaseNotification } from '@/components/workspace/NotificationPopover';

export default function NotificationsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [notifications, setNotifications] = useState<BaseNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const res = await csrfFetch(`/api/workspaces/${workspaceId}/notifications?limit=50`);
                if (!res.ok) throw new Error('Failed to fetch notifications map');
                const data = await res.json();
                setNotifications(data.data?.notifications || []);
            } catch (err) {
                console.error(err);
                setError('Failed to pull intelligence traces. Please verify connection.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, [workspaceId]);

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications & Intelligence</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Unified timeline detailing Oracle predictions, Nerve anomalies, and systemic Audit Logs.
                    </p>
                </div>
            </div>

            <div className="card">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-nerve border-t-transparent" />
                    </div>
                ) : error ? (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-500">
                        {error}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="rounded-full bg-surface-2 p-4 text-muted-foreground mb-4">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">No Available Intelligence</h3>
                        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                            When Oracle predicts capacity burnout or systemic audits occur, traces will populate this timeline.
                        </p>
                    </div>
                ) : (
                    <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                        {notifications.map((notif, idx) => (
                            <div key={notif.id || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                {/* Timeline Dot */}
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface-1 bg-surface-2 text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${notif.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-500 border-red-500/20' :
                                    notif.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' :
                                        notif.type === 'AI_INSIGHT' ? 'bg-cortex/20 text-cortex border-cortex/20' : ''
                                    }`}>
                                    {notif.type === 'AI_INSIGHT' ? (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                        </svg>
                                    )}
                                </div>

                                {/* Card Body */}
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] rounded-xl border border-border bg-surface-1 p-4 shadow-sm transition-transform hover:-translate-y-1">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                                {notif.type === 'AI_INSIGHT' && (
                                                    <span className="text-xs uppercase font-bold text-nerve bg-nerve/10 px-2 py-0.5 rounded-sm">
                                                        Oracle
                                                    </span>
                                                )}
                                                {notif.title}
                                            </h3>
                                            <time className="text-xs text-muted-foreground mr-1">
                                                {new Date(notif.createdAt).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric',
                                                    hour: 'numeric', minute: 'numeric'
                                                })}
                                            </time>
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {notif.description || (notif.metadata as any)?.description || "Routine system trace processed."}
                                        </div>

                                        {/* Expand AI Recommendations */}
                                        {notif.type === 'AI_INSIGHT' && notif.metadata && (notif.metadata as any).recommendations && (
                                            <div className="mt-3 rounded-lg bg-surface-2 p-3 border border-border/50">
                                                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2 flex items-center gap-1">
                                                    <svg className="h-3 w-3 text-oracle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a8.966 8.966 0 01-3-2.92m3 2.92a8.966 8.966 0 003-2.92m-3-2.92a8.966 8.966 0 00-3-2.92" />
                                                    </svg>
                                                    Mitigation Strategy
                                                </h4>
                                                <ul className="list-inside list-disc space-y-1 pl-1">
                                                    {((notif.metadata as any).recommendations as string[]).map((rec, rIdx) => (
                                                        <li key={rIdx} className="text-xs text-slate-400">
                                                            {rec}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
