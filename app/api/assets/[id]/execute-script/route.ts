import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { z } from 'zod';

const executeScriptSchema = z.object({
    scriptName: z.string().min(1).max(200),
    scriptBody: z.string().min(1).max(100000),
    language: z.enum(['powershell', 'bash', 'python']),
});

// POST /api/assets/[id]/execute-script - Execute script on asset
export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: assetId } = await context.params;
    const user = await requireAuth();

    const asset = await prisma.asset.findFirst({
        where: {
            id: assetId,
            workspace: {
                members: { some: { userId: user.id } },
            },
        },
        include: { agentConnection: true, workspace: true },
    });

    if (!asset) {
        return apiError(404, 'Asset not found or access denied');
    }
    if (!asset.agentConnection) {
        return apiError(400, 'No agent installed on this asset');
    }
    if (asset.agentConnection.status === 'OFFLINE') {
        return apiSuccess(
            { error: 'Agent is offline. Script will be queued and executed when agent comes online.' },
            { status: 202 }
        );
    }

    const body = await request.json();
    const data = executeScriptSchema.parse(body);

    const execution = await prisma.scriptExecution.create({
        data: {
            agentId: asset.agentConnection.id,
            assetId: asset.id,
            workspaceId: asset.workspaceId!,
            scriptName: data.scriptName,
            scriptBody: data.scriptBody,
            language: data.language,
            status: 'PENDING',
            createdBy: user.id,
        },
    });

    return apiSuccess({
        executionId: execution.id,
        status: 'pending',
        message: 'Script queued for execution',
    });
});

// GET /api/assets/[id]/execute-script - Get script execution history
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: assetId } = await context.params;
    const user = await requireAuth();

    const asset = await prisma.asset.findFirst({
        where: {
            id: assetId,
            workspace: {
                members: { some: { userId: user.id } },
            },
        },
    });

    if (!asset) {
        return apiError(404, 'Asset not found or access denied');
    }

    const executions = await prisma.scriptExecution.findMany({
        where: { assetId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    return apiSuccess({ executions });
});
