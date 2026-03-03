import type { Metadata } from 'next';
import { AuthGuard } from '@/components/AuthGuard';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';

export const metadata: Metadata = {
    title: 'Dashboard',
    description: 'Overview of your IT operations and asset metrics',
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AuthGuard><WorkspaceLayout>{children}</WorkspaceLayout></AuthGuard>;
}
