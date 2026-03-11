import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { z } from 'zod';
import { CronExpressionParser } from 'cron-parser';

const updateScheduleSchema = z.object({
    name: z.string().min(1, 'Name is required').optional(),
    description: z.string().optional(),
    targetIds: z.array(z.string()).min(1, 'At least one target agent must be selected').optional(),
    cronExpression: z.string().min(1, 'Cron expression is required').optional(),
    enabled: z.boolean().optional(),
});

// PATCH - Update a script schedule
export const PATCH = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string, scheduleId: string }> }
) => {
    const { id: workspaceId, scheduleId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    const schedule = await prisma.scriptSchedule.findUnique({
        where: { id: scheduleId, workspaceId },
    });

    if (!schedule) {
        return apiError(404, 'Schedule not found');
    }

    const body = await request.json();
    const data = updateScheduleSchema.parse(body);

    const updateData: any = { ...data };

    // If cron expression is updated, we need to recalculate nextRunAt
    if (data.cronExpression && data.cronExpression !== schedule.cronExpression) {
        try {
            const interval = CronExpressionParser.parse(data.cronExpression);
            updateData.nextRunAt = interval.next().toDate();
        } catch (err: any) {
            return apiError(400, 'Invalid cron expression');
        }
    }
    // If just re-enabling an existing cron, recalculate nextRunAt
    else if (data.enabled === true && schedule.enabled === false) {
        try {
            const interval = CronExpressionParser.parse(schedule.cronExpression);
            updateData.nextRunAt = interval.next().toDate();
        } catch (err) {
            // Should not happen if it was valid before, but safe fallback
        }
    }

    const updated = await prisma.scriptSchedule.update({
        where: { id: scheduleId },
        data: updateData,
        include: {
            script: {
                select: { id: true, name: true, language: true }
            }
        }
    });

    return apiSuccess({ schedule: updated });
});

// DELETE - Delete a script schedule
export const DELETE = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string, scheduleId: string }> }
) => {
    const { id: workspaceId, scheduleId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(workspaceId, user.id, 'ADMIN');

    const schedule = await prisma.scriptSchedule.findUnique({
        where: { id: scheduleId, workspaceId },
    });

    if (!schedule) {
        return apiError(404, 'Schedule not found');
    }

    await prisma.scriptSchedule.delete({
        where: { id: scheduleId },
    });

    return apiSuccess({ message: 'Schedule deleted successfully' });
});
