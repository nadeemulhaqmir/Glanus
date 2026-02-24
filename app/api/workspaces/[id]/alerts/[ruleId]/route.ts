import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { z } from 'zod';

const updateAlertRuleSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    metric: z.enum(['CPU', 'RAM', 'DISK', 'OFFLINE']).optional(),
    threshold: z.number().min(0).max(1440).optional(),
    duration: z.number().min(0).max(60).optional(),
    severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
    enabled: z.boolean().optional(),
    notifyEmail: z.boolean().optional(),
    notifyWebhook: z.boolean().optional(),
});

// GET - Get single alert rule
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string; ruleId: string }> }
) => {
    const { id: workspaceId, ruleId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(workspaceId, user.id);

    const alertRule = await prisma.alertRule.findFirst({
        where: { id: ruleId, workspaceId },
    });

    if (!alertRule) {
        return apiError(404, 'Alert rule not found');
    }

    return apiSuccess(alertRule);
});

// PATCH - Update alert rule (ADMIN or higher)
export const PATCH = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string; ruleId: string }> }
) => {
    const { id: workspaceId, ruleId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    const existingRule = await prisma.alertRule.findFirst({
        where: { id: ruleId, workspaceId },
    });

    if (!existingRule) {
        return apiError(404, 'Alert rule not found');
    }

    const body = await request.json();
    const data = updateAlertRuleSchema.parse(body);

    const alertRule = await prisma.alertRule.update({
        where: { id: ruleId },
        data,
    });

    await prisma.auditLog.create({
        data: {
            action: 'ALERT_RULE_UPDATED',
            resourceType: 'AlertRule',
            resourceId: ruleId,
            userId: user.id,
            metadata: { ruleName: alertRule.name, changes: data },
        },
    });

    return apiSuccess(alertRule);
});

// DELETE - Delete alert rule (ADMIN or higher)
export const DELETE = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string; ruleId: string }> }
) => {
    const { id: workspaceId, ruleId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    const existingRule = await prisma.alertRule.findFirst({
        where: { id: ruleId, workspaceId },
    });

    if (!existingRule) {
        return apiError(404, 'Alert rule not found');
    }

    await prisma.alertRule.delete({ where: { id: ruleId } });

    await prisma.auditLog.create({
        data: {
            action: 'ALERT_RULE_DELETED',
            resourceType: 'AlertRule',
            resourceId: ruleId,
            userId: user.id,
            metadata: { ruleName: existingRule.name },
        },
    });

    return apiSuccess({ message: 'Alert rule deleted successfully' });
});
