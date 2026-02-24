'use client';

interface ReliabilityScoreProps {
    /** Score from 0-100 */
    score: number;
    /** Previous score for trend calculation */
    previousScore?: number;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number): string {
    if (score >= 90) return 'hsl(var(--health-good))';
    if (score >= 70) return 'hsl(var(--oracle))';
    return 'hsl(var(--health-critical))';
}

function getScoreLabel(score: number): string {
    if (score >= 95) return 'Excellent';
    if (score >= 90) return 'Healthy';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 50) return 'Degraded';
    return 'Critical';
}

export function ReliabilityScore({ score, previousScore, size = 'md' }: ReliabilityScoreProps) {
    const color = getScoreColor(score);
    const label = getScoreLabel(score);
    const trend = previousScore !== undefined ? score - previousScore : 0;

    const dimensions = {
        sm: { size: 80, stroke: 5, fontSize: 'text-lg', labelSize: 'text-2xs' },
        md: { size: 120, stroke: 6, fontSize: 'text-3xl', labelSize: 'text-xs' },
        lg: { size: 160, stroke: 8, fontSize: 'text-5xl', labelSize: 'text-sm' },
    }[size];

    const radius = (dimensions.size - dimensions.stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const offset = circumference - progress;

    return (
        <div className="flex flex-col items-center gap-2">
            {/* Circular gauge */}
            <div className="relative" style={{ width: dimensions.size, height: dimensions.size }}>
                <svg
                    width={dimensions.size}
                    height={dimensions.size}
                    viewBox={`0 0 ${dimensions.size} ${dimensions.size}`}
                    className="-rotate-90"
                >
                    {/* Background track */}
                    <circle
                        cx={dimensions.size / 2}
                        cy={dimensions.size / 2}
                        r={radius}
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth={dimensions.stroke}
                    />
                    {/* Progress arc */}
                    <circle
                        cx={dimensions.size / 2}
                        cy={dimensions.size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={dimensions.stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`${dimensions.fontSize} font-bold`} style={{ color }}>
                        {score}
                    </span>
                </div>
            </div>

            {/* Label */}
            <div className="flex items-center gap-2">
                <span className={`${dimensions.labelSize} font-medium text-muted-foreground`}>
                    {label}
                </span>
                {trend !== 0 && (
                    <span className={`${dimensions.labelSize} font-medium ${trend > 0 ? 'text-health-good' : 'text-health-critical'
                        }`}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
                    </span>
                )}
            </div>
        </div>
    );
}
