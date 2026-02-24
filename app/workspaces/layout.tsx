import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Workspace',
    description: 'Manage your workspace settings, members, and assets',
};

export default function WorkspacesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
