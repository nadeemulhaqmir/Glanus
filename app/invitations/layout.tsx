import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Invitation',
    description: 'Accept your workspace invitation',
};

export default function InvitationsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
