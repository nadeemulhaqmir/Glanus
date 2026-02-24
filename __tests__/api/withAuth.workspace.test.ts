/**
 * @jest-environment node
 */
/**
 * Workspace Authorization Middleware — Unit Tests
 *
 * Tests hasMinimumRole and role hierarchy logic from withAuth.ts
 */

import { hasMinimumRole } from '@/lib/api/withAuth';

describe('Workspace Authorization', () => {
    describe('hasMinimumRole', () => {
        // ─── OWNER (highest) ─────────────────────────────
        it('OWNER meets OWNER requirement', () => {
            expect(hasMinimumRole('OWNER', 'OWNER')).toBe(true);
        });

        it('OWNER meets ADMIN requirement', () => {
            expect(hasMinimumRole('OWNER', 'ADMIN')).toBe(true);
        });

        it('OWNER meets MEMBER requirement', () => {
            expect(hasMinimumRole('OWNER', 'MEMBER')).toBe(true);
        });

        it('OWNER meets VIEWER requirement', () => {
            expect(hasMinimumRole('OWNER', 'VIEWER')).toBe(true);
        });

        // ─── ADMIN ───────────────────────────────────────
        it('ADMIN does NOT meet OWNER requirement', () => {
            expect(hasMinimumRole('ADMIN', 'OWNER')).toBe(false);
        });

        it('ADMIN meets ADMIN requirement', () => {
            expect(hasMinimumRole('ADMIN', 'ADMIN')).toBe(true);
        });

        it('ADMIN meets MEMBER requirement', () => {
            expect(hasMinimumRole('ADMIN', 'MEMBER')).toBe(true);
        });

        it('ADMIN meets VIEWER requirement', () => {
            expect(hasMinimumRole('ADMIN', 'VIEWER')).toBe(true);
        });

        // ─── MEMBER ──────────────────────────────────────
        it('MEMBER does NOT meet OWNER requirement', () => {
            expect(hasMinimumRole('MEMBER', 'OWNER')).toBe(false);
        });

        it('MEMBER does NOT meet ADMIN requirement', () => {
            expect(hasMinimumRole('MEMBER', 'ADMIN')).toBe(false);
        });

        it('MEMBER meets MEMBER requirement', () => {
            expect(hasMinimumRole('MEMBER', 'MEMBER')).toBe(true);
        });

        it('MEMBER meets VIEWER requirement', () => {
            expect(hasMinimumRole('MEMBER', 'VIEWER')).toBe(true);
        });

        // ─── VIEWER (lowest) ─────────────────────────────
        it('VIEWER does NOT meet OWNER requirement', () => {
            expect(hasMinimumRole('VIEWER', 'OWNER')).toBe(false);
        });

        it('VIEWER does NOT meet ADMIN requirement', () => {
            expect(hasMinimumRole('VIEWER', 'ADMIN')).toBe(false);
        });

        it('VIEWER does NOT meet MEMBER requirement', () => {
            expect(hasMinimumRole('VIEWER', 'MEMBER')).toBe(false);
        });

        it('VIEWER meets VIEWER requirement', () => {
            expect(hasMinimumRole('VIEWER', 'VIEWER')).toBe(true);
        });
    });
});
