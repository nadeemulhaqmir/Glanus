'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download, FileText, Activity, Server, AlertTriangle } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { csrfFetch } from '@/lib/api/csrfFetch';

export default function ReportsPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const { error: showError } = useToast();
    const [isGenerating, setIsGenerating] = useState<string | null>(null);

    const handleDownload = async (type: string) => {
        setIsGenerating(type);
        try {
            const res = await csrfFetch(`/api/workspaces/${workspaceId}/reports?type=${type}`, {
                method: 'GET'
            });

            if (!res.ok) throw new Error('Failed to generate report');

            // Handle Blob
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `glanus_report_${type}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            showError('Report Generation Failed', err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsGenerating(null);
        }
    };

    const reports = [
        {
            id: 'asset_inventory',
            title: 'Complete Asset Inventory',
            description: 'A full CSV export of all tracked assets, dynamic attributes, lifecycles, and assigned users.',
            icon: Server,
            color: 'text-blue-500'
        },
        {
            id: 'rmm_health',
            title: 'Agent Health & Uptime',
            description: 'Aggregated telemetry covering online/offline states, latency dropouts, and CPU usage norms.',
            icon: Activity,
            color: 'text-green-500'
        },
        {
            id: 'cortex_insights',
            title: 'AI CORTEX Diagnostic Summaries',
            description: 'Exported resolution logs and un-acknowledged infrastructure anomalies flagged by the AI engine.',
            icon: AlertTriangle,
            color: 'text-amber-500'
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Executive Reports</h1>
                <p className="text-muted-foreground">Generate, schedule, and download analytical summaries to CSV directly from the database.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map(report => (
                    <Card key={report.id} className="p-6 flex flex-col items-start gap-4 hover:border-slate-700 transition-colors">
                        <div className={`p-3 rounded-lg bg-slate-800 ${report.color}`}>
                            <report.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-2">{report.title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">{report.description}</p>
                        </div>
                        <Button
                            className="w-full mt-4"
                            variant="secondary"
                            onClick={() => handleDownload(report.id)}
                            disabled={isGenerating === report.id}
                        >
                            {isGenerating === report.id ? (
                                'Generating...'
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Export CSV format
                                </>
                            )}
                        </Button>
                    </Card>
                ))}
            </div>

            <Card className="p-6 mt-8 border-dashed border-slate-700 bg-slate-900/50">
                <div className="flex items-start gap-4">
                    <div className="p-2 rounded bg-slate-800">
                        <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                        <h4 className="text-slate-200 font-medium mb-1">Scheduled PDF Deliveries</h4>
                        <p className="text-sm text-slate-500">
                            Configure weekly or monthly automated report deliveries via email to stakeholders. (Enterprise Plan only).
                        </p>
                        <Button variant="secondary" size="sm" className="mt-4" disabled>Coming Soon</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
