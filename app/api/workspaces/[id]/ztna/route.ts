import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createZtnaSchema = z.object({
    isEnabled: z.boolean().default(false),
    ipWhitelist: z.string().min(3).max(1000), // e.g. "192.168.1.1, 10.0.0.0/8"
    action: z.string().default('BLOCK'),
});

export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();

    // Requires ADMIN level to read network security policies
    await requireWorkspaceRole(params.id, user.id, 'ADMIN', request);

    const policies = await (prisma as any).ztnaPolicy.findMany({
        where: { workspaceId: params.id },
        orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(policies);
});

export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();

    // Requires ADMIN level to dictate network access
    await requireWorkspaceRole(params.id, user.id, 'ADMIN', request);

    const body = await request.json();
    const result = createZtnaSchema.safeParse(body);

    if (!result.success) {
        return apiError(400, 'Invalid ZTNA policy data', result.error.errors);
    }

    const { isEnabled, ipWhitelist, action } = result.data;

    // Enforce 1 active policy limit per Workspace to prevent overlap confusion
    const existingCount = await (prisma as any).ztnaPolicy.count({
        where: { workspaceId: params.id }
    });

    if (existingCount > 0) {
        return apiError(400, 'Only one ZTNA policy object is supported per Workspace. Please update the existing policy instead.');
    }

    // Type casting helps traverse edge scenarios where Next generation hasn't fully 
    // populated the exact `ztnaPolicy` global map on this distinct branch
    const policy = await (prisma as any).ztnaPolicy.create({
        data: {
            workspaceId: params.id,
            isEnabled,
            ipWhitelist,
            action
        }
    });

    return apiSuccess(policy, { message: 'Zero-Trust Network Policy created.' }, 201);
});
