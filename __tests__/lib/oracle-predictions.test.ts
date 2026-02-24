/**
 * @jest-environment node
 */
/**
 * ORACLE Prediction Engine — Unit Tests
 *
 * Tests the pure helper functions: linearExtrapolation, classifyForecastSeverity, formatDuration
 */

import {
    linearExtrapolation,
    classifyForecastSeverity,
    formatDuration,
} from '@/lib/oracle/predictions';

describe('ORACLE Prediction Engine', () => {
    // ─── linearExtrapolation ──────────────────────────────
    describe('linearExtrapolation', () => {
        it('returns null for fewer than 3 data points', () => {
            expect(linearExtrapolation([50, 60], 90)).toBeNull();
        });

        it('returns null for flat / non-increasing trend', () => {
            expect(linearExtrapolation([50, 50, 50, 50], 90)).toBeNull();
        });

        it('returns null for decreasing trend', () => {
            expect(linearExtrapolation([80, 70, 60, 50], 90)).toBeNull();
        });

        it('predicts threshold breach for rising trend', () => {
            const result = linearExtrapolation([50, 55, 60, 65, 70], 90);
            expect(result).not.toBeNull();
            expect(result!.predictedValue).toBe(90);
            expect(result!.timeToThresholdMs).toBeGreaterThan(0);
            expect(result!.confidence).toBeGreaterThan(0);
            expect(result!.confidence).toBeLessThanOrEqual(1);
        });

        it('produces higher confidence for closer predictions', () => {
            // Steep slope — threshold hit soon → higher confidence
            const steep = linearExtrapolation([70, 75, 80, 85], 90);
            // Gentle slope — threshold hit later → lower confidence
            const gentle = linearExtrapolation([50, 51, 52, 53], 90);

            expect(steep).not.toBeNull();
            expect(gentle).not.toBeNull();
            expect(steep!.confidence).toBeGreaterThan(gentle!.confidence);
        });

        it('returns null when current value already exceeds threshold (stepsToThreshold <= 0)', () => {
            // Array rising past the threshold already
            const result = linearExtrapolation([85, 90, 95, 100], 90);
            // slope > 0, but current (100) > threshold (90) so stepsToThreshold <= 0
            expect(result).toBeNull();
        });
    });

    // ─── classifyForecastSeverity ─────────────────────────
    describe('classifyForecastSeverity', () => {
        const hours = (h: number) => h * 60 * 60 * 1000;

        it('returns "critical" for < 2 hours', () => {
            expect(classifyForecastSeverity(hours(1))).toBe('critical');
            expect(classifyForecastSeverity(hours(0.5))).toBe('critical');
        });

        it('returns "high" for 2-12 hours', () => {
            expect(classifyForecastSeverity(hours(2))).toBe('high');
            expect(classifyForecastSeverity(hours(6))).toBe('high');
        });

        it('returns "medium" for 12-48 hours', () => {
            expect(classifyForecastSeverity(hours(12))).toBe('medium');
            expect(classifyForecastSeverity(hours(24))).toBe('medium');
        });

        it('returns "low" for > 48 hours', () => {
            expect(classifyForecastSeverity(hours(48))).toBe('low');
            expect(classifyForecastSeverity(hours(100))).toBe('low');
        });
    });

    // ─── formatDuration ───────────────────────────────────
    describe('formatDuration', () => {
        const minutes = (m: number) => m * 60 * 1000;
        const hours = (h: number) => h * 60 * 60 * 1000;
        const days = (d: number) => d * 24 * 60 * 60 * 1000;

        it('formats sub-hour durations as minutes', () => {
            expect(formatDuration(minutes(30))).toBe('~30 minutes');
        });

        it('formats 1-24 hours as hours', () => {
            expect(formatDuration(hours(3))).toBe('~3 hours');
            expect(formatDuration(hours(12))).toBe('~12 hours');
        });

        it('formats 1-7 days as days', () => {
            expect(formatDuration(days(3))).toBe('~3 days');
        });

        it('formats > 7 days as weeks', () => {
            expect(formatDuration(days(14))).toBe('~2 weeks');
        });
    });
});
