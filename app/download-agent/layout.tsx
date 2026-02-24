import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Download Agent',
    description: 'Download the Glanus monitoring agent for your devices',
};

export default function DownloadAgentLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
