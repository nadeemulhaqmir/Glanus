import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

const createKeySchema = z.object({
    name: z.string().min(1, 'Key name is required').max(100),
    scopes: z.array(z.enum(['read', 'write', 'admin', 'agents', 'scripts'])).min(1, 'At least one scope is required'),
    expiresIn: z.enum(['never', '30d', '90d', '1y']).optional(),
});

/**
 * GET /api/workspaces/[id]/api-keys
 * List all API keys for a workspace (never returns plaintext keys)
 */
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'ADMIN');

    const keys = await prisma.apiKey.findMany({
        where: { workspaceId: params.id },
        select: {
            id: true,
            name: true,
            prefix: true,
            scopes: true,
            lastUsedAt: true,
            usageCount: true,
            expiresAt: true,
            revokedAt: true,
            createdBy: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({ keys });
});

/**
 * POST /api/workspaces/[id]/api-keys
 * Generate a new API key. Returns the plaintext key ONCE (never stored).
 */
export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'ADMIN');

    const body = await request.json();
    const data = createKeySchema.parse(body);

    // Generate a cryptographically secure API key
    const rawKey = `glns_${crypto.randomBytes(32).toString('hex')}`;
    const prefix = rawKey.slice(0, 13); // "glns_" + 8 hex chars
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (data.expiresIn && data.expiresIn !== 'never') {
        expiresAt = new Date();
        switch (data.expiresIn) {
            case '30d': expiresAt.setDate(expiresAt.getDate() + 30); break;
            case '90d': expiresAt.setDate(expiresAt.getDate() + 90); break;
            case '1y': expiresAt.setFullYear(expiresAt.getFullYear() + 1); break;
        }
    }

    const apiKey = await prisma.apiKey.create({
        data: {
            workspaceId: params.id,
            name: data.name,
            prefix,
            keyHash,
            scopes: data.scopes,
            expiresAt,
            createdBy: user.id,
        },
        select: {
            id: true,
            name: true,
            prefix: true,
            scopes: true,
            expiresAt: true,
            createdAt: true,
        },
    });

    // Audit log
    await prisma.auditLog.create({
        data: {
            workspaceId: params.id,
            userId: user.id,
            action: 'api_key.created',
            resourceType: 'api_key',
            resourceId: apiKey.id,
            details: { name: data.name, scopes: data.scopes, expiresIn: data.expiresIn || 'never' },
        },
    });

    // Return the raw key ONCE — this is the only time it's available
    return apiSuccess({
        key: { ...apiKey, rawKey },
    }, { message: 'API key generated. Copy the key now — it will not be shown again.' }, 201);
});

/**
 * DELETE /api/workspaces/[id]/api-keys
 * Revoke an API key by ID (soft delete via revokedAt timestamp)
 */
export const DELETE = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'ADMIN');

    const url = new URL(request.url);
    const keyId = url.searchParams.get('keyId');
    if (!keyId) return apiError(400, 'keyId parameter is required.');

    const existing = await prisma.apiKey.findUnique({
        where: { id: keyId, workspaceId: params.id },
    });

    if (!existing) return apiError(404, 'API key not found.');
    if (existing.revokedAt) return apiError(400, 'Key is already revoked.');

    await prisma.apiKey.update({
        where: { id: keyId },
        data: { revokedAt: new Date() },
    });

    await prisma.auditLog.create({
        data: {
            workspaceId: params.id,
            userId: user.id,
            action: 'api_key.revoked',
            resourceType: 'api_key',
            resourceId: keyId,
            details: { name: existing.name },
        },
    });

    return apiSuccess({ revoked: true }, { message: 'API key revoked successfully.' });
});
