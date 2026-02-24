import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, label, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-300">
                        {label}
                    </label>
                )}
                <input
                    type={type}
                    id={inputId}
                    ref={ref}
                    className={cn(
                        'w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-white transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-nerve/20',
                        error
                            ? 'border-health-critical focus:border-health-critical focus:ring-red-500/20'
                            : 'border-slate-700 focus:border-nerve/50',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="mt-1 text-sm text-health-critical">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
