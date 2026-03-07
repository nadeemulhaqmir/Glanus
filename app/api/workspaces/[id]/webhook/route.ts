import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { z } from 'zod';

const webhookSchema = z.object({
    url: z.string().url(),
    enabled: z.boolean().optional(),
    secret: z.string().optional(),
});

// GET - Get webhook configuration
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    const webhook = await prisma.notificationWebhook.findFirst({
        where: { workspaceId },
    });

    return apiSuccess({ webhook });
});

// POST - Create or update webhook (ADMIN or higher)
export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    const body = await request.json();
    const data = webhookSchema.parse(body);

    const existing = await prisma.notificationWebhook.findFirst({
        where: { workspaceId },
    });

    let webhook;
    if (existing) {
        webhook = await prisma.notificationWebhook.update({
            where: { id: existing.id },
            data: {
                url: data.url,
                enabled: data.enabled ?? true,
                secret: data.secret,
            },
        });
    } else {
        webhook = await prisma.notificationWebhook.create({
            data: { ...data, workspaceId, enabled: data.enabled ?? true },
        });
    }

    return apiSuccess(webhook, undefined, existing ? 200 : 201);
});

// DELETE - Delete webhook (ADMIN or higher)
export const DELETE = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    await prisma.notificationWebhook.deleteMany({
        where: { workspaceId },
    });

    return apiSuccess({ message: 'Webhook deleted successfully' });
});
