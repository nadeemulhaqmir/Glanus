import type { Metadata } from 'next';
import { AuthGuard } from '@/components/AuthGuard';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';

export const metadata: Metadata = {
    title: 'Remote Desktop',
    description: 'Securely access and manage remote machines',
};

export default function RemoteLayout({ children }: { children: React.ReactNode }) {
    return <AuthGuard><WorkspaceLayout>{children}</WorkspaceLayout></AuthGuard>;
}
