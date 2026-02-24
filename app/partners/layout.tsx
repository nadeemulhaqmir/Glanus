import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Partners',
    description: 'Glanus partner portal and certification program',
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
