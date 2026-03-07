import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { z } from 'zod';

const agentVersionSchema = z.object({
    version: z.string().min(1),
    platform: z.enum(['WINDOWS', 'MACOS', 'LINUX']),
    downloadUrl: z.string().url(),
    checksum: z.string().min(64).max(64), // SHA-256 is 64 hex chars
    status: z.enum(['ACTIVE', 'DEPRECATED', 'BETA']),
    required: z.boolean().default(false),
    releaseNotes: z.string().optional()
});

export const GET = withErrorHandler(async () => {
    const user = await requireAuth();

    // Only Global Admins
    if (user.role !== 'ADMIN') {
        return apiError(403, 'Forbidden. Requires Platform Administrator privileges.');
    }

    const versions = await prisma.agentVersion.findMany({
        orderBy: [{ platform: 'asc' }, { createdAt: 'desc' }]
    });

    return apiSuccess({ versions });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
    const user = await requireAuth();

    if (user.role !== 'ADMIN') {
        return apiError(403, 'Forbidden. Requires Platform Administrator privileges.');
    }

    try {
        const body = await request.json();
        const data = agentVersionSchema.parse(body);

        // If making this ACTIVE, optionally demote others for this platform
        if (data.status === 'ACTIVE') {
            await prisma.agentVersion.updateMany({
                where: { platform: data.platform, status: 'ACTIVE' },
                data: { status: 'DEPRECATED' }
            });
        }

        const version = await prisma.agentVersion.upsert({
            where: {
                version_platform: {
                    version: data.version,
                    platform: data.platform
                }
            },
            update: data,
            create: data
        });

        return apiSuccess({ version }, undefined, 201);
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            return apiError(400, 'Invalid request data', error.errors);
        }
        return apiError(500, 'Failed to publish agent version');
    }
});
