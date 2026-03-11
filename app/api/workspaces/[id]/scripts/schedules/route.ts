import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { z } from 'zod';
import { CronExpressionParser } from 'cron-parser';

const createScheduleSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    scriptId: z.string().min(1, 'Script ID is required'),
    targetIds: z.array(z.string()).min(1, 'At least one target agent must be selected'),
    cronExpression: z.string().min(1, 'Cron expression is required'),
});

// GET - List all script schedules for a workspace
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    const schedules = await prisma.scriptSchedule.findMany({
        where: { workspaceId },
        include: {
            script: {
                select: { id: true, name: true, language: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return apiSuccess({ schedules });
});

// POST - Create a new script schedule
export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    const body = await request.json();
    const data = createScheduleSchema.parse(body);

    // Validate cron expression and calculate next run
    let nextRunAt: Date;
    try {
        const interval = CronExpressionParser.parse(data.cronExpression);
        nextRunAt = interval.next().toDate();
    } catch (err: any) {
        return apiError(400, 'Invalid cron expression');
    }

    // Verify script exists in workspace
    const script = await prisma.script.findFirst({
        where: { id: data.scriptId, workspaceId }
    });

    if (!script) {
        return apiError(404, 'Script not found');
    }

    const schedule = await prisma.scriptSchedule.create({
        data: {
            workspaceId,
            scriptId: data.scriptId,
            name: data.name,
            description: data.description,
            targetIds: data.targetIds,
            cronExpression: data.cronExpression,
            nextRunAt,
            enabled: true
        },
        include: {
            script: {
                select: { id: true, name: true, language: true }
            }
        }
    });

    return apiSuccess({ schedule }, undefined, 201);
});
