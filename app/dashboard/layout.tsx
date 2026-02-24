import type { Metadata } from 'next';
import { AuthGuard } from '@/components/AuthGuard';

export const metadata: Metadata = {
    title: 'Dashboard',
    description: 'Overview of your IT operations and asset metrics',
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AuthGuard>{children}</AuthGuard>;
}
