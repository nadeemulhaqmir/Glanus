import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Onboarding',
    description: 'Set up your Glanus workspace and configure your environment',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
