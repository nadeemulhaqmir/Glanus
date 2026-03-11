import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createScheduleSchema = z.object({
    name: z.string().min(1, 'Schedule name is required').max(100),
    reportType: z.enum(['asset_inventory', 'rmm_health', 'cortex_insights']),
    format: z.enum(['csv']).default('csv'),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    timeOfDay: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format').default('08:00'),
    timezone: z.string().default('UTC'),
    recipients: z.array(z.string().email('Each recipient must be a valid email')).min(1, 'At least one recipient email is required'),
    enabled: z.boolean().default(true),
});

/**
 * GET /api/workspaces/[id]/reports/schedules
 * List all scheduled report delivery configurations
 */
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'MEMBER');

    const schedules = await prisma.reportSchedule.findMany({
        where: { workspaceId: params.id },
        orderBy: { createdAt: 'desc' }
    });

    return apiSuccess({ schedules });
});

/**
 * POST /api/workspaces/[id]/reports/schedules
 * Create a new scheduled report delivery
 */
export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceRole(params.id, user.id, 'ADMIN');

    const body = await request.json();
    const data = createScheduleSchema.parse(body);

    // Validate frequency-specific fields
    if (data.frequency === 'weekly' && data.dayOfWeek === undefined) {
        data.dayOfWeek = 1; // Default to Monday
    }
    if (data.frequency === 'monthly' && data.dayOfMonth === undefined) {
        data.dayOfMonth = 1; // Default to 1st of month
    }

    const schedule = await prisma.reportSchedule.create({
        data: {
            workspaceId: params.id,
            name: data.name,
            reportType: data.reportType,
            format: data.format,
            frequency: data.frequency,
            dayOfWeek: data.dayOfWeek,
            dayOfMonth: data.dayOfMonth,
            timeOfDay: data.timeOfDay,
            timezone: data.timezone,
            recipients: data.recipients,
            enabled: data.enabled,
            createdBy: user.id,
        }
    });

    // Audit trail
    await prisma.auditLog.create({
        data: {
            workspaceId: params.id,
            userId: user.id,
            action: 'report_schedule.created',
            resourceType: 'report_schedule',
            resourceId: schedule.id,
            details: {
                name: schedule.name,
                reportType: schedule.reportType,
                frequency: schedule.frequency,
                recipientCount: schedule.recipients.length
            }
        }
    });

    return apiSuccess({ schedule }, { message: 'Report schedule created successfully' }, 201);
});
