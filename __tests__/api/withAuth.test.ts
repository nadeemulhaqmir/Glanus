/**
 * @jest-environment node
 */
/**
 * Critical Path Tests — Auth Middleware
 */

import { hasMinimumRole } from '@/lib/api/withAuth';

describe('Auth Middleware', () => {
    describe('hasMinimumRole', () => {
        it('OWNER meets any requirement', () => {
            expect(hasMinimumRole('OWNER', 'OWNER')).toBe(true);
            expect(hasMinimumRole('OWNER', 'ADMIN')).toBe(true);
            expect(hasMinimumRole('OWNER', 'MEMBER')).toBe(true);
            expect(hasMinimumRole('OWNER', 'VIEWER')).toBe(true);
        });

        it('ADMIN meets ADMIN and below', () => {
            expect(hasMinimumRole('ADMIN', 'OWNER')).toBe(false);
            expect(hasMinimumRole('ADMIN', 'ADMIN')).toBe(true);
            expect(hasMinimumRole('ADMIN', 'MEMBER')).toBe(true);
            expect(hasMinimumRole('ADMIN', 'VIEWER')).toBe(true);
        });

        it('MEMBER meets MEMBER and below', () => {
            expect(hasMinimumRole('MEMBER', 'OWNER')).toBe(false);
            expect(hasMinimumRole('MEMBER', 'ADMIN')).toBe(false);
            expect(hasMinimumRole('MEMBER', 'MEMBER')).toBe(true);
            expect(hasMinimumRole('MEMBER', 'VIEWER')).toBe(true);
        });

        it('VIEWER only meets VIEWER', () => {
            expect(hasMinimumRole('VIEWER', 'OWNER')).toBe(false);
            expect(hasMinimumRole('VIEWER', 'ADMIN')).toBe(false);
            expect(hasMinimumRole('VIEWER', 'MEMBER')).toBe(false);
            expect(hasMinimumRole('VIEWER', 'VIEWER')).toBe(true);
        });
    });
});
