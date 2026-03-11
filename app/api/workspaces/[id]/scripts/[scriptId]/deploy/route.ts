import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const deployScriptSchema = z.object({
    targetAgentIds: z.array(z.string()).min(1, 'You must select at least one agent to deploy to.')
});

/**
 * POST /api/workspaces/[id]/scripts/[scriptId]/deploy
 * Mass Execution REST Endpoint
 * 
 * Takes an array of Agent IDs, verifies they belong to the workspace and are currently ONLINE,
 * then batch-creates ScriptExecution rows for them to sequentially pull on their next heartbeat.
 */
export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string, scriptId: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    // Requires ADMIN level to authorize arbitrary code execution across fleets
    await requireWorkspaceRole(params.id, user.id, 'ADMIN');

    const body = await request.json();
    const data = deployScriptSchema.parse(body);

    // Fetch the script to deploy
    const script = await prisma.script.findUnique({
        where: { id: params.scriptId, workspaceId: params.id }
    });

    if (!script) {
        return apiError(404, 'Script template not found.');
    }

    // Verify agents exist, belong to this workspace, and are actively online
    const targetAgents = await prisma.agentConnection.findMany({
        where: {
            id: { in: data.targetAgentIds },
            workspaceId: params.id,
            status: 'ONLINE' // Protect against queue building for dead machines
        },
        select: {
            id: true,
            assetId: true,
            hostname: true
        }
    });

    if (targetAgents.length === 0) {
        return apiError(400, 'None of the provided agents are currently ONLINE or available in this workspace.');
    }

    // Prepare execution queue mappings
    const executionsData = targetAgents.map(agent => ({
        workspaceId: params.id,
        agentId: agent.id,
        assetId: agent.assetId,
        scriptId: script.id,
        scriptName: script.name,
        scriptBody: script.content,
        language: script.language,
        status: 'PENDING' as const,
        createdBy: user.id
    }));

    // Batch spawn execution jobs
    await prisma.scriptExecution.createMany({
        data: executionsData
    });

    // Extract exact IDs to return in payload for routing
    const spawnedExecutions = await prisma.scriptExecution.findMany({
        where: {
            scriptId: script.id,
            agentId: { in: targetAgents.map(a => a.id) },
            status: 'PENDING'
        },
        orderBy: { createdAt: 'desc' },
        take: targetAgents.length
    });

    // Record deployment in Audit Log
    await prisma.auditLog.create({
        data: {
            workspaceId: params.id,
            userId: user.id,
            action: 'script.deployed',
            resourceType: 'script',
            resourceId: script.id,
            details: {
                name: script.name,
                language: script.language,
                targetCount: targetAgents.length,
                targetAgents: targetAgents.map(a => a.hostname)
            }
        }
    });

    return apiSuccess({
        deployedCount: targetAgents.length,
        skippedCount: data.targetAgentIds.length - targetAgents.length,
        executions: spawnedExecutions
    }, { message: `Successfully deployed script to ${targetAgents.length} agents.` }, 201);
});
