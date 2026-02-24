import * as Sentry from '@sentry/nextjs';

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Validate environment variables at startup
        const { assertEnvValid } = await import('./lib/env');
        assertEnvValid();

        await import('./sentry.server.config')
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config')
    }
}

export const onRequestError = Sentry.captureRequestError;
