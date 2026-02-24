import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Remote Desktop',
    description: 'Securely access and manage remote machines',
};

export default function RemoteLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
