'use client';

import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';

export default function WorkspaceIdLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <WorkspaceLayout>{children}</WorkspaceLayout>;
}
