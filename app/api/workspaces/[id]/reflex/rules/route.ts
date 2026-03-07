import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { getRules, saveRule } from '@/lib/reflex/automation';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { verifyWorkspaceAccess } from '@/lib/workspace/permissions';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id]/reflex/rules - List automation rules
export const GET = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
    const user = await requireAuth();
    const { id: workspaceId } = await context.params;

    const access = await verifyWorkspaceAccess(user.email, workspaceId);
    if (!access.allowed) {
        return apiError(403, 'Forbidden - Insufficient permissions');
    }

    try {
        const rules = await getRules(workspaceId);
        return apiSuccess(rules);
    } catch (error: unknown) {
        return apiError(500, 'Failed to fetch reflex automation rules', (error as Error).message);
    }
});

// POST /api/workspaces/[id]/reflex/rules - Create or update an automation rule
export const POST = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
    const user = await requireAuth();
    const { id: workspaceId } = await context.params;

    const access = await verifyWorkspaceAccess(user.email, workspaceId);
    // Strict RBAC: Only Owners and Admins can forge autonomous rule executions
    if (!access.allowed || (access.role !== 'OWNER' && access.role !== 'ADMIN')) {
        return apiError(403, 'Forbidden - Requires Admin permissions to manage automation rules');
    }

    try {
        const body = await request.json();

        // Very basic validation - in production, this should leverage Zod schemas
        if (!body.name || !body.trigger || !body.action || !body.autonomyLevel) {
            return apiError(400, 'Missing required rule fields: name, trigger, action, autonomyLevel');
        }

        const rulePayload = {
            id: body.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: body.name,
            description: body.description || '',
            trigger: body.trigger,
            action: body.action,
            autonomyLevel: body.autonomyLevel,
            enabled: body.enabled ?? true,
            cooldownMinutes: body.cooldownMinutes ?? 60,
            createdBy: user.id,
            workspaceId,
        };

        const rule = await saveRule(workspaceId, rulePayload);
        return apiSuccess(rule, { message: 'Automation rule saved successfully' }, 201);
    } catch (error: unknown) {
        return apiError(500, 'Failed to save automation rule', (error as Error).message);
    }
});
