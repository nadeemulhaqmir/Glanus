import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { AuthGuard } from '@/components/AuthGuard';

export const metadata: Metadata = {
    title: 'Assets',
    description: 'Manage and track your IT assets',
};

export default function AssetsLayout({ children }: { children: ReactNode }) {
    return <AuthGuard>{children}</AuthGuard>;
}
