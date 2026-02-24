import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { z } from 'zod';

const alertRuleSchema = z.object({
    name: z.string().min(1).max(255),
    metric: z.enum(['CPU', 'RAM', 'DISK', 'OFFLINE']),
    threshold: z.number().min(0).max(1440), // 0-100% or 0-1440 minutes
    duration: z.number().min(0).max(60), // 0-60 minutes
    severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
    notifyEmail: z.boolean().optional(),
    notifyWebhook: z.boolean().optional(),
});

// GET - List all alert rules for workspace
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(workspaceId, user.id);

    const alertRules = await prisma.alertRule.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({ alertRules });
});

// POST - Create new alert rule (ADMIN or higher)
export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    const body = await request.json();
    const data = alertRuleSchema.parse(body);

    const alertRule = await prisma.alertRule.create({
        data: {
            ...data,
            workspaceId,
            createdBy: user.id,
            enabled: true,
        },
    });

    await prisma.auditLog.create({
        data: {
            action: 'ALERT_RULE_CREATED',
            resourceType: 'AlertRule',
            resourceId: alertRule.id,
            userId: user.id,
            metadata: { ruleName: alertRule.name, metric: alertRule.metric, threshold: alertRule.threshold },
        },
    });

    return apiSuccess(alertRule, undefined, 201);
});
