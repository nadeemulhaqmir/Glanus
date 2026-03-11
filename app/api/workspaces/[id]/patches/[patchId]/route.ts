import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError, apiDeleted } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updatePatchPolicySchema = z.object({
    name: z.string().min(1).max(255).optional(),
    targetSoftware: z.string().min(1).max(255).optional(),
    actionScriptId: z.string().optional(),
    isEnabled: z.boolean().optional(),
});

export const DELETE = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string; patchId: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'ADMIN');

    const policy = await prisma.patchPolicy.findUnique({
        where: { id: params.patchId, workspaceId: params.id }
    });

    if (!policy) {
        return apiError(404, 'Patch policy not found');
    }

    await prisma.patchPolicy.delete({
        where: { id: params.patchId }
    });

    return apiDeleted();
});

export const PATCH = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string; patchId: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'ADMIN');

    const body = await request.json();
    const result = updatePatchPolicySchema.safeParse(body);

    if (!result.success) {
        return apiError(400, 'Invalid request data', result.error.errors);
    }

    const data = result.data;

    const policy = await prisma.patchPolicy.findUnique({
        where: { id: params.patchId, workspaceId: params.id }
    });

    if (!policy) {
        return apiError(404, 'Patch policy not found');
    }

    if (data.actionScriptId) {
        const script = await prisma.script.findUnique({
            where: { id: data.actionScriptId, workspaceId: params.id }
        });
        if (!script) {
            return apiError(404, 'Replacement remediation script not found');
        }
    }

    const updated = await prisma.patchPolicy.update({
        where: { id: params.patchId },
        data,
        include: {
            actionScript: { select: { id: true, name: true, language: true } },
        }
    });

    return apiSuccess(updated);
});
