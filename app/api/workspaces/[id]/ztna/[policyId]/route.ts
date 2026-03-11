import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError, apiDeleted } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateZtnaSchema = z.object({
    isEnabled: z.boolean().optional(),
    ipWhitelist: z.string().min(3).max(1000).optional(),
    action: z.string().optional(),
});

export const PATCH = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string; policyId: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();

    await requireWorkspaceRole(params.id, user.id, 'ADMIN', request);

    const body = await request.json();
    const result = updateZtnaSchema.safeParse(body);

    if (!result.success) {
        return apiError(400, 'Invalid ZTNA policy update data', result.error.errors);
    }

    const policy = await (prisma as any).ztnaPolicy.findUnique({
        where: { id: params.policyId, workspaceId: params.id }
    });

    if (!policy) {
        return apiError(404, 'Zero-Trust Network Policy not found');
    }

    const updated = await (prisma as any).ztnaPolicy.update({
        where: { id: params.policyId },
        data: result.data
    });

    return apiSuccess(updated, { message: 'Zero-Trust Network Policy updated.' });
});

export const DELETE = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string; policyId: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();

    await requireWorkspaceRole(params.id, user.id, 'ADMIN', request);

    const policy = await (prisma as any).ztnaPolicy.findUnique({
        where: { id: params.policyId, workspaceId: params.id }
    });

    if (!policy) {
        return apiError(404, 'Zero-Trust Network Policy not found');
    }

    await (prisma as any).ztnaPolicy.delete({
        where: { id: params.policyId }
    });

    return apiDeleted();
});
