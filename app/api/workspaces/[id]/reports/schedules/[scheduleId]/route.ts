import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateScheduleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    timezone: z.string().optional(),
    recipients: z.array(z.string().email()).min(1).optional(),
    enabled: z.boolean().optional(),
});

/**
 * GET /api/workspaces/[id]/reports/schedules/[scheduleId]
 * Fetch details of a single report schedule
 */
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string; scheduleId: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'MEMBER');

    const schedule = await prisma.reportSchedule.findUnique({
        where: { id: params.scheduleId, workspaceId: params.id },
    });

    if (!schedule) return apiError(404, 'Schedule not found.');

    return apiSuccess({ schedule });
});

/**
 * PATCH /api/workspaces/[id]/reports/schedules/[scheduleId]
 * Update a report schedule (toggle, change frequency, recipients, etc.)
 */
export const PATCH = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string; scheduleId: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'ADMIN');

    const existing = await prisma.reportSchedule.findUnique({
        where: { id: params.scheduleId, workspaceId: params.id },
    });

    if (!existing) return apiError(404, 'Schedule not found.');

    const body = await request.json();
    const data = updateScheduleSchema.parse(body);

    const updated = await prisma.reportSchedule.update({
        where: { id: params.scheduleId },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.frequency && { frequency: data.frequency }),
            ...(data.dayOfWeek !== undefined && { dayOfWeek: data.dayOfWeek }),
            ...(data.dayOfMonth !== undefined && { dayOfMonth: data.dayOfMonth }),
            ...(data.timeOfDay && { timeOfDay: data.timeOfDay }),
            ...(data.timezone && { timezone: data.timezone }),
            ...(data.recipients && { recipients: data.recipients }),
            ...(data.enabled !== undefined && { enabled: data.enabled }),
        }
    });

    await prisma.auditLog.create({
        data: {
            workspaceId: params.id,
            userId: user.id,
            action: 'report_schedule.updated',
            resourceType: 'report_schedule',
            resourceId: updated.id,
            details: { changes: Object.keys(data) }
        }
    });

    return apiSuccess({ schedule: updated });
});

/**
 * DELETE /api/workspaces/[id]/reports/schedules/[scheduleId]
 * Permanently remove a report schedule
 */
export const DELETE = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string; scheduleId: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'ADMIN');

    const existing = await prisma.reportSchedule.findUnique({
        where: { id: params.scheduleId, workspaceId: params.id },
    });

    if (!existing) return apiError(404, 'Schedule not found.');

    await prisma.reportSchedule.delete({
        where: { id: params.scheduleId }
    });

    await prisma.auditLog.create({
        data: {
            workspaceId: params.id,
            userId: user.id,
            action: 'report_schedule.deleted',
            resourceType: 'report_schedule',
            resourceId: existing.id,
            details: { name: existing.name }
        }
    });

    return apiSuccess(null, { message: 'Schedule deleted successfully' });
});
