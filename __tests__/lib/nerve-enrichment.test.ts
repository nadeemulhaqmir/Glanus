/**
 * @jest-environment node
 */
/**
 * NERVE Enrichment Engine — Unit Tests
 *
 * Tests the pure helper functions: classifyDeviation, computeDeviations, computeHealthScore
 */

import {
    classifyDeviation,
    computeDeviations,
    computeHealthScore,
} from '@/lib/nerve/enrichment';

describe('NERVE Enrichment Engine', () => {
    // ─── classifyDeviation ────────────────────────────────
    describe('classifyDeviation', () => {
        it('returns "normal" when baseline is 0', () => {
            expect(classifyDeviation(50, 0)).toBe('normal');
        });

        it('returns "normal" for small deviation', () => {
            expect(classifyDeviation(55, 50)).toBe('normal'); // 10% deviation
        });

        it('returns "elevated" for 25-50% deviation', () => {
            expect(classifyDeviation(65, 50)).toBe('elevated'); // 30% deviation
        });

        it('returns "high" for 50-100% deviation', () => {
            expect(classifyDeviation(80, 50)).toBe('high'); // 60% deviation
        });

        it('returns "critical" for >100% deviation', () => {
            expect(classifyDeviation(110, 50)).toBe('critical'); // 120% deviation
        });

        it('returns "normal" when current equals baseline', () => {
            expect(classifyDeviation(50, 50)).toBe('normal');
        });

        it('returns "normal" when current is below baseline', () => {
            expect(classifyDeviation(30, 50)).toBe('normal'); // Negative deviation
        });
    });

    // ─── computeDeviations ────────────────────────────────
    describe('computeDeviations', () => {
        const normalBaselines = { cpuAvg: 50, ramAvg: 50, diskAvg: 50 };

        it('returns empty array when all metrics are near baseline', () => {
            const result = computeDeviations(52, 52, 52, normalBaselines);
            expect(result).toEqual([]);
        });

        it('detects CPU deviation above 15% threshold', () => {
            const result = computeDeviations(80, 50, 50, normalBaselines);
            const cpuDev = result.find(d => d.metric === 'cpu');
            expect(cpuDev).toBeDefined();
            expect(cpuDev!.currentValue).toBe(80);
            expect(cpuDev!.baselineAvg).toBe(50);
        });

        it('detects RAM deviation above 15% threshold', () => {
            const result = computeDeviations(50, 75, 50, normalBaselines);
            const ramDev = result.find(d => d.metric === 'ram');
            expect(ramDev).toBeDefined();
        });

        it('detects disk deviation above 10% threshold', () => {
            const result = computeDeviations(50, 50, 60, normalBaselines);
            const diskDev = result.find(d => d.metric === 'disk');
            expect(diskDev).toBeDefined();
        });

        it('handles zero baselines without division errors', () => {
            const zeroBaselines = { cpuAvg: 0, ramAvg: 0, diskAvg: 0 };
            const result = computeDeviations(50, 50, 50, zeroBaselines);
            expect(result).toEqual([]);
        });

        it('detects multiple deviations simultaneously', () => {
            const result = computeDeviations(90, 90, 80, normalBaselines);
            expect(result.length).toBeGreaterThanOrEqual(2);
        });
    });

    // ─── computeHealthScore ───────────────────────────────
    describe('computeHealthScore', () => {
        it('returns 100 when all metrics are low', () => {
            expect(computeHealthScore(10, 10, 10)).toBe(100);
        });

        it('deducts 5 for CPU 60-75', () => {
            expect(computeHealthScore(65, 10, 10)).toBe(95);
        });

        it('deducts 15 for CPU 75-90', () => {
            expect(computeHealthScore(80, 10, 10)).toBe(85);
        });

        it('deducts 30 for CPU >90', () => {
            expect(computeHealthScore(95, 10, 10)).toBe(70);
        });

        it('deducts 25 for RAM >90', () => {
            expect(computeHealthScore(10, 95, 10)).toBe(75);
        });

        it('deducts 30 for disk >95', () => {
            expect(computeHealthScore(10, 10, 98)).toBe(70);
        });

        it('never goes below 0', () => {
            expect(computeHealthScore(95, 95, 98)).toBe(Math.max(0, 100 - 30 - 25 - 30));
        });

        it('handles all metrics at critical simultaneously', () => {
            const score = computeHealthScore(95, 95, 98);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThan(30);
        });
    });
});
