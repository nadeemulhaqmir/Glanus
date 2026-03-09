'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { csrfFetch } from '@/lib/api/csrfFetch';
import { UserPlus, ShieldAlert, Mail } from 'lucide-react';

interface Member {
    id: string;
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
    joinedAt: string;
    user: {
        name: string | null;
        email: string;
    };
}

export default function WorkspaceMembersPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Invite Modal State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('VIEWER');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const res = await csrfFetch(`/api/workspaces/${workspaceId}/members`);
                if (!res.ok) throw new Error('Failed to load members');
                const data = await res.json();
                setMembers(data.data?.members || data.members || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch members');
            } finally {
                setIsLoading(false);
            }
        };

        if (workspaceId) fetchMembers();
    }, [workspaceId]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setIsSubmitting(true);
        try {
            const res = await csrfFetch(`/api/workspaces/${workspaceId}/invitations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to send invite');
            }

            // Reset and close
            setInviteEmail('');
            setInviteRole('VIEWER');
            setIsInviteModalOpen(false);
            alert('Invitation sent successfully!'); // In a real app, use a toast
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to send invite');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-2" />
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Access Denied</h3>
                <p className="text-slate-400">{error}</p>
            </div>
        );
    }

    // Sort: OWNER first, then admins, then others
    const sortedMembers = [...members].sort((a, b) => {
        const roles = { OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1 };
        return roles[b.role] - roles[a.role];
    });

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button type="button"
                    onClick={() => router.push(`/workspaces/${workspaceId}`)}
                    className="text-sm text-nerve hover:underline mb-4"
                >
                    ← Back to Dashboard
                </button>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">Team Members</h1>
                        <p className="text-slate-400">Manage who has access to this workspace and their roles</p>
                    </div>
                    <button type="button"
                        onClick={() => setIsInviteModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-nerve text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all hover:shadow-lg hover:shadow-nerve/20"
                    >
                        <UserPlus className="w-4 h-4" />
                        Invite Member
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 tracking-wider">
                            <th className="px-6 py-4 pb-3 w-1/2">User</th>
                            <th className="px-6 py-4 pb-3">Role</th>
                            <th className="px-6 py-4 pb-3">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {sortedMembers.map((member) => (
                            <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-medium text-slate-300 shrink-0">
                                            {member.user.name?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground text-sm">
                                                {member.user.name || 'Unknown User'}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {member.user.email}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${member.role === 'OWNER'
                                        ? 'bg-health-good/10 text-health-good border-health-good/20'
                                        : member.role === 'ADMIN'
                                            ? 'bg-nerve/10 text-nerve border-nerve/20'
                                            : 'bg-slate-800 text-slate-300 border-slate-700'
                                        }`}>
                                        {member.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-400">
                                    {new Date(member.joinedAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-nerve/10 flex items-center justify-center text-nerve">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Invite Teammate</h2>
                                <p className="text-xs text-slate-400">They will receive an email link to join</p>
                            </div>
                        </div>

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="colleague@company.com"
                                    className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-nerve/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Assign Role</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER' | 'VIEWER')}
                                    className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-nerve/50 appearance-none"
                                >
                                    <option value="VIEWER">Viewer (Read-only access)</option>
                                    <option value="MEMBER">Member (Can manage assets)</option>
                                    <option value="ADMIN">Admin (Full access except billing)</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setIsInviteModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-nerve hover:brightness-110 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Sending...' : 'Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
