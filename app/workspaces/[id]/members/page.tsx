'use client';

import { use } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import MemberList from '@/components/workspace/MemberList';
import InviteForm from '@/components/workspace/InviteForm';
import PendingInvites from '@/components/workspace/PendingInvites';

export default function WorkspaceMembersPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = use(paramsPromise);
    // We can also fetch workspace here if store is empty, similar to settings page
    // But usually main layout or switcher handles initial fetch.
    // We pass ID explicitly to components to be safe.

    const { currentWorkspace } = useWorkspaceStore();
    const isOwnerOrAdmin = currentWorkspace?.userRole === 'OWNER' || currentWorkspace?.userRole === 'ADMIN';

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Team Members</h1>
                <p className="text-slate-500 mt-1">
                    Manage who has access to this workspace.
                </p>
            </div>

            <div className="space-y-8">
                {/* Invite Form (only for admins) */}
                {isOwnerOrAdmin && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        <InviteForm workspaceId={params.id} />
                    </div>
                )}

                {/* Member List */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <MemberList workspaceId={params.id} />
                </div>

                {/* Pending Invites (only for admins) */}
                {isOwnerOrAdmin && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                        <PendingInvites workspaceId={params.id} />
                    </div>
                )}
            </div>
        </div>
    );
}
