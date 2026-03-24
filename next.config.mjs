import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
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
    eslint: {
        ignoreDuringBuilds: true,
    },

    typescript: {
        ignoreBuildErrors: true,
    },
    serverExternalPackages: ['ssh2', 'cpu-features', 'node-ssh', 'isomorphic-dompurify', 'jsdom', 'whatwg-url', '@exodus/bytes', 'html-encoding-sniffer'],

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
