/**
 * Critical Path Tests — Environment Validation
 */

describe('Environment Validation', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('validates required env vars are present', async () => {
        process.env.DATABASE_URL = 'postgresql://test';
        process.env.NEXTAUTH_SECRET = 'test-secret';
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
        (process.env as any).NODE_ENV = 'development';

        const { validateEnv } = await import('@/lib/env');
        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.missing).toHaveLength(0);
    });

    it('reports missing required vars', async () => {
        delete process.env.DATABASE_URL;
        delete process.env.NEXTAUTH_SECRET;
        delete process.env.NEXTAUTH_URL;
        (process.env as any).NODE_ENV = 'development';

        const { validateEnv } = await import('@/lib/env');
        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.missing).toContain('DATABASE_URL');
        expect(result.missing).toContain('NEXTAUTH_SECRET');
        expect(result.missing).toContain('NEXTAUTH_URL');
    });

    it('warns about production-only vars in development', async () => {
        process.env.DATABASE_URL = 'postgresql://test';
        process.env.NEXTAUTH_SECRET = 'test-secret';
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
        (process.env as any).NODE_ENV = 'development';
        delete process.env.STRIPE_SECRET_KEY;

        const { validateEnv } = await import('@/lib/env');
        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.warnings.some(w => w.includes('STRIPE_SECRET_KEY'))).toBe(true);
    });

    it('requires production vars in production mode', async () => {
        process.env.DATABASE_URL = 'postgresql://test';
        process.env.NEXTAUTH_SECRET = 'real-secret';
        process.env.NEXTAUTH_URL = 'https://app.glanus.com';
        (process.env as any).NODE_ENV = 'production';
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_WEBHOOK_SECRET;
        delete process.env.CSRF_SECRET;
        delete process.env.SENTRY_DSN;

        const { validateEnv } = await import('@/lib/env');
        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.missing).toContain('STRIPE_SECRET_KEY');
        expect(result.missing).toContain('CSRF_SECRET');
    });

    it('warns about default NEXTAUTH_SECRET', async () => {
        process.env.DATABASE_URL = 'postgresql://test';
        process.env.NEXTAUTH_SECRET = 'your-secret-key-here-change-in-production';
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
        (process.env as any).NODE_ENV = 'development';

        const { validateEnv } = await import('@/lib/env');
        const result = validateEnv();

        expect(result.warnings.some(w => w.includes('NEXTAUTH_SECRET'))).toBe(true);
    });

    it('warns about short CSRF_SECRET', async () => {
        process.env.DATABASE_URL = 'postgresql://test';
        process.env.NEXTAUTH_SECRET = 'test-secret';
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
        process.env.CSRF_SECRET = 'short';
        (process.env as any).NODE_ENV = 'development';

        const { validateEnv } = await import('@/lib/env');
        const result = validateEnv();

        expect(result.warnings.some(w => w.includes('CSRF_SECRET'))).toBe(true);
    });
});
