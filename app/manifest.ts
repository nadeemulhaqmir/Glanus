import type { MetadataRoute } from 'next';

/**
 * Web App Manifest
 * 
 * Provides metadata for PWA installation and browser integration.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Glanus - IT Operations Platform',
        short_name: 'Glanus',
        description: 'Unified platform for remote desktop, asset management, and AI-powered IT operations',
        start_url: '/dashboard',
        display: 'standalone',
        background_color: '#020617',
        theme_color: '#0ea5e9',
        icons: [
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
