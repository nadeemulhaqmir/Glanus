'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { csrfFetch } from '@/lib/api/csrfFetch';
import { Settings, ShieldAlert, AlertTriangle, Building2, Paintbrush } from 'lucide-react';

interface WorkspaceDetails {
    id: string;
    name: string;
    description: string | null;
    primaryColor: string | null;
    accentColor: string | null;
}

export default function WorkspaceSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [workspace, setWorkspace] = useState<WorkspaceDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [primaryColor, setPrimaryColor] = useState('');
    const [accentColor, setAccentColor] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Deletion State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await csrfFetch(`/api/workspaces/${workspaceId}`);
                if (!res.ok) throw new Error('Failed to load workspace settings');
                const data = await res.json();
                const ws = data.data?.workspace || data.workspace;

                setWorkspace(ws);
                setName(ws.name || '');
                setDescription(ws.description || '');
                setPrimaryColor(ws.primaryColor || '#3B82F6');
                setAccentColor(ws.accentColor || '#10B981');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch settings');
            } finally {
                setIsLoading(false);
            }
        };

        if (workspaceId) fetchSettings();
    }, [workspaceId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await csrfFetch(`/api/workspaces/${workspaceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, primaryColor, accentColor }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update settings');
            }
            alert('Settings saved successfully!');
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirmText !== workspace?.name) return;

        setIsDeleting(true);
        try {
            const res = await csrfFetch(`/api/workspaces/${workspaceId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to delete workspace');

            setIsDeleteModalOpen(false);
            router.push('/dashboard'); // Kick back to root
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to delete workspace');
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-2" />
                <div className="space-y-4">
                    <div className="h-64 animate-pulse rounded-xl bg-surface-2" />
                    <div className="h-48 animate-pulse rounded-xl bg-surface-2" />
                </div>
            </div>
        );
    }

    if (error || !workspace) {
        return (
            <div className="text-center py-12">
                <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
                <p className="text-slate-400">You must be the Workspace Owner to view this page.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button type="button"
                    onClick={() => router.push(`/workspaces/${workspaceId}`)}
                    className="text-sm text-nerve hover:underline mb-4"
                >
                    ← Back to Dashboard
                </button>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-nerve/10 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-nerve" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Workspace Settings</h1>
                        <p className="text-slate-400">Manage organization details and destructive actions</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                {/* General Settings */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Building2 className="w-5 h-5 text-slate-400" />
                        <h2 className="text-xl font-semibold text-white">General Information</h2>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Workspace Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-nerve/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-nerve/50 resize-y"
                                placeholder="A brief description of this organization..."
                            />
                        </div>
                    </div>
                </div>

                {/* Branding */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Paintbrush className="w-5 h-5 text-slate-400" />
                        <h2 className="text-xl font-semibold text-white">Brand Accent Colors</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Primary Color (Hex)</label>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg border border-slate-700 shrink-0 shadow-inner" style={{ backgroundColor: primaryColor }} />
                                <input
                                    type="text"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    pattern="^#[0-9A-Fa-f]{6}$"
                                    className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-nerve/50 uppercase"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Accent Color (Hex)</label>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg border border-slate-700 shrink-0 shadow-inner" style={{ backgroundColor: accentColor }} />
                                <input
                                    type="text"
                                    value={accentColor}
                                    onChange={(e) => setAccentColor(e.target.value)}
                                    pattern="^#[0-9A-Fa-f]{6}$"
                                    className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-nerve/50 uppercase"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-nerve hover:brightness-110 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                        >
                            {isSaving ? 'Saving Changes...' : 'Save Configuration'}
                        </button>
                    </div>
                </div>
            </form>

            <hr className="my-12 border-slate-800" />

            {/* Danger Zone */}
            <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />

                <h2 className="text-xl font-bold text-destructive mb-2">Danger Zone</h2>
                <p className="text-sm text-slate-400 max-w-2xl mb-6">
                    Deleting a workspace is an irreversible action. All assets, agent telemetry data, and member associations will be permanently destroyed.
                </p>

                <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-6 py-2.5 bg-destructive text-white text-sm font-medium rounded-lg hover:bg-destructive/90 transition-colors shadow-lg shadow-destructive/20"
                >
                    Delete Workspace
                </button>
            </div>

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-destructive/20 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4 text-destructive">
                                <AlertTriangle className="w-6 h-6" />
                                <h2 className="text-xl font-bold">Delete Workspace?</h2>
                            </div>

                            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                                This action <span className="font-bold text-white">cannot be undone</span>. This will permanently delete the
                                <span className="font-bold text-white px-1">{workspace.name}</span> workspace, its members, assets, and all AI insight history.
                            </p>

                            <div className="bg-slate-950 rounded-lg p-4 mb-6 border border-slate-800">
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Please type <span className="font-bold text-white select-all">{workspace.name}</span> to confirm.
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className="w-full bg-black border-slate-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-destructive focus:border-destructive font-mono text-sm"
                                    placeholder={workspace.name}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setDeleteConfirmText('');
                                    }}
                                    className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleteConfirmText !== workspace.name || isDeleting}
                                    className="px-6 py-2.5 bg-destructive hover:bg-destructive/90 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? 'Deleting...' : 'I understand, delete workspace'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
