'use client';

import { useState } from 'react';
import { csrfFetch } from '@/lib/api/csrfFetch';
import { useToast } from '@/lib/toast';

interface Props {
    workspaceId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export function MdmProfileForm({ workspaceId, onSuccess, onCancel }: Props) {
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        platform: 'WINDOWS',
        profileType: 'SECURITY',
        configPayload: '{\n  "policies": {}\n}',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // validate json payload
            let parsedPayload;
            try {
                parsedPayload = JSON.parse(formData.configPayload);
            } catch (err: unknown) {
                throw new Error('Invalid JSON payload: ' + (err as Error).message);
            }

            const res = await csrfFetch(`/api/workspaces/${workspaceId}/mdm/profiles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    configPayload: parsedPayload
                }),
            });

            if (res.ok) {
                success('MDM profile created successfully');
                onSuccess();
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create profile');
            }
        } catch (err: unknown) {
            showError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Profile Name</label>
                    <input
                        type="text"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-nerve"
                        placeholder="e.g. Enforce BitLocker Encryption"
                        value={formData.name}
                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Description (Optional)</label>
                    <textarea
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-nerve h-20"
                        placeholder="Ensures all assigned Windows devices encrypt OS drives."
                        value={formData.description}
                        onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Platform</label>
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-nerve [&>option]:bg-slate-900"
                            value={formData.platform}
                            onChange={(e) => setFormData(p => ({ ...p, platform: e.target.value }))}
                        >
                            <option value="WINDOWS">Windows</option>
                            <option value="MACOS">macOS</option>
                            <option value="LINUX">Linux</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Profile Type</label>
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-nerve [&>option]:bg-slate-900"
                            value={formData.profileType}
                            onChange={(e) => setFormData(p => ({ ...p, profileType: e.target.value }))}
                        >
                            <option value="RESTRICTION">Restriction</option>
                            <option value="WIFI">Wi-Fi configuration</option>
                            <option value="VPN">VPN Gateway</option>
                            <option value="APPLICATION">Application deployment</option>
                            <option value="SECURITY">Security policy</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Configuration Payload (JSON)</label>
                    <textarea
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-muted-foreground font-mono text-xs focus:outline-none focus:border-nerve h-48"
                        value={formData.configPayload}
                        onChange={(e) => setFormData(p => ({ ...p, configPayload: e.target.value }))}
                        spellCheck={false}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-nerve text-black px-6 py-2 rounded-lg font-medium hover:bg-nerve/90 transition-colors disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Create Profile'}
                </button>
            </div>
        </form>
    );
}
