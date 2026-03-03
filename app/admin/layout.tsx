import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';

export const metadata: Metadata = {
    title: 'Admin',
    description: 'Administration and configuration',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
    return <AuthGuard><WorkspaceLayout>{children}</WorkspaceLayout></AuthGuard>;
}
