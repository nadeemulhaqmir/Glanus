import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    eslint: {
        // ~80 files have pre-existing lint issues (mostly Prisma JSON `any` casts).
        // Lint sweep is tracked separately; tsc --noEmit is the real safety gate.
        ignoreDuringBuilds: true,
    },
    serverExternalPackages: ['ssh2', 'node-ssh', 'isomorphic-dompurify', 'jsdom'],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
}

export default withSentryConfig(nextConfig, {
    // Sentry configuration options
    silent: true, // Suppresses source map uploading logs during build
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
}, {
    // Additional config options for the Sentry webpack plugin
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: '/monitoring',
    hideSourceMaps: true,
    disableLogger: true,
})
