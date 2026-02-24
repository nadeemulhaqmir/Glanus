import { cn } from '@/lib/utils';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    className?: string;
}

export function Badge({ children, variant = 'primary', className }: BadgeProps) {
    const variants = {
        primary: 'bg-nerve/15 text-nerve',
        success: 'bg-health-good/15 text-health-good',
        warning: 'bg-health-warn/15 text-health-warn',
        danger: 'bg-health-critical/15 text-health-critical',
        info: 'bg-nerve/15 text-nerve',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
