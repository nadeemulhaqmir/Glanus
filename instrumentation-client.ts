import * as Sentry from '@sentry/nextjs'

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% when errors occur

    integrations: [
        Sentry.replayIntegration({
            maskAllText: true, // Privacy: mask all text
            blockAllMedia: true, // Privacy: block media
        }),
    ],

    environment: process.env.NODE_ENV,

    // Filter out low-priority errors
    beforeSend(event, hint) {
        if (event.exception) {
            const error = hint.originalException
            if (error && typeof error === 'object' && 'message' in error) {
                const message = error.message as string

                // Ignore known benign errors
                if (message.includes('ResizeObserver loop') ||
                    message.includes('Non-Error promise rejection')) {
                    return null
                }
            }
        }
        return event
    },

    // Enable debug in development
    debug: process.env.NODE_ENV === 'development',
})
