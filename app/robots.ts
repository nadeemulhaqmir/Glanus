import type { MetadataRoute } from 'next';

/**
 * Robots.txt configuration
 * 
 * Allows search engines to index public pages while
 * blocking admin, auth, and API routes.
 */
export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://glanus.io';

    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/partners', '/privacy', '/terms'],
                disallow: [
                    '/api/',
                    '/admin/',
                    '/dashboard/',
                    '/assets/',
                    '/workspaces/',
                    '/onboarding',
                    '/login',
                    '/signup',
                    '/forgot-password',
                    '/reset-password',
                    '/remote/',
                    '/invitations/',
                    '/download-agent',
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
