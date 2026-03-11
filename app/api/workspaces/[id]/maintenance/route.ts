import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceAccess, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    type: z.enum(['preventive', 'corrective', 'inspection']).default('preventive'),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    assetId: z.string().min(1),
    notes: z.string().optional(),
    cost: z.number().min(0).optional(),
});

const updateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().nullable().optional(),
    type: z.enum(['preventive', 'corrective', 'inspection']).optional(),
    scheduledStart: z.string().datetime().optional(),
    scheduledEnd: z.string().datetime().optional(),
    actualStart: z.string().datetime().nullable().optional(),
    actualEnd: z.string().datetime().nullable().optional(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    notes: z.string().nullable().optional(),
    cost: z.number().min(0).nullable().optional(),
});

/**
 * GET /api/workspaces/[id]/maintenance
 * List maintenance windows for a workspace with optional filters.
 * 
 * Query params:
 *   - assetId: filter by asset
 *   - status: filter by status
 *   - upcoming: 'true' to only show future scheduled maintenance
 *   - limit: max results (default 50)
 */
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(params.id, user.id);

    const url = new URL(request.url);
    const assetId = url.searchParams.get('assetId');
    const status = url.searchParams.get('status');
    const upcoming = url.searchParams.get('upcoming') === 'true';
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));

    const windows = await prisma.maintenanceWindow.findMany({
        where: {
            workspaceId: params.id,
            ...(assetId && { assetId }),
            ...(status && { status }),
            ...(upcoming && { scheduledStart: { gte: new Date() }, status: 'scheduled' }),
        },
        include: {
            asset: { select: { id: true, name: true, status: true } },
        },
        orderBy: { scheduledStart: 'asc' },
        take: limit,
    });

    return apiSuccess({ windows });
});

/**
 * POST /api/workspaces/[id]/maintenance
 * Create a new maintenance window.
 */
export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(params.id, user.id);

    const body = await request.json();
    const data = createSchema.parse(body);

    // Verify asset belongs to this workspace
    const asset = await prisma.asset.findFirst({
        where: { id: data.assetId, workspaceId: params.id },
    });
    if (!asset) {
        return apiError(400, 'Asset not found in this workspace.');
    }

    // Validate scheduling: end must be after start
    if (new Date(data.scheduledEnd) <= new Date(data.scheduledStart)) {
        return apiError(400, 'Scheduled end must be after scheduled start.');
    }

    const window = await prisma.maintenanceWindow.create({
        data: {
            title: data.title,
            description: data.description,
            type: data.type,
            scheduledStart: new Date(data.scheduledStart),
            scheduledEnd: new Date(data.scheduledEnd),
            priority: data.priority,
            notes: data.notes,
            cost: data.cost,
            assetId: data.assetId,
            workspaceId: params.id,
            createdById: user.id,
        },
        include: {
            asset: { select: { id: true, name: true } },
        },
    });

    // Audit log
    await prisma.auditLog.create({
        data: {
            workspaceId: params.id,
            userId: user.id,
            action: 'maintenance.created',
            resourceType: 'maintenanceWindow',
            resourceId: window.id,
            details: { title: data.title, assetId: data.assetId, priority: data.priority },
        },
    });

    return apiSuccess({ window }, { message: 'Maintenance window created.' });
});

/**
 * PATCH /api/workspaces/[id]/maintenance
 * Update an existing maintenance window.
 * Expects ?windowId= query param.
 */
export const PATCH = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(params.id, user.id);

    const url = new URL(request.url);
    const windowId = url.searchParams.get('windowId');
    if (!windowId) return apiError(400, 'windowId query parameter is required.');

    const existing = await prisma.maintenanceWindow.findFirst({
        where: { id: windowId, workspaceId: params.id },
    });
    if (!existing) return apiError(404, 'Maintenance window not found.');

    const body = await request.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.maintenanceWindow.update({
        where: { id: windowId },
        data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.type !== undefined && { type: data.type }),
            ...(data.scheduledStart !== undefined && { scheduledStart: new Date(data.scheduledStart) }),
            ...(data.scheduledEnd !== undefined && { scheduledEnd: new Date(data.scheduledEnd) }),
            ...(data.actualStart !== undefined && { actualStart: data.actualStart ? new Date(data.actualStart) : null }),
            ...(data.actualEnd !== undefined && { actualEnd: data.actualEnd ? new Date(data.actualEnd) : null }),
            ...(data.status !== undefined && { status: data.status }),
            ...(data.priority !== undefined && { priority: data.priority }),
            ...(data.notes !== undefined && { notes: data.notes }),
            ...(data.cost !== undefined && { cost: data.cost }),
        },
        include: {
            asset: { select: { id: true, name: true } },
        },
    });

    return apiSuccess({ window: updated }, { message: 'Maintenance window updated.' });
});

/**
 * DELETE /api/workspaces/[id]/maintenance
 * Delete a maintenance window.
 * Expects ?windowId= query param.
 */
export const DELETE = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(params.id, user.id);

    const url = new URL(request.url);
    const windowId = url.searchParams.get('windowId');
    if (!windowId) return apiError(400, 'windowId query parameter is required.');

    const existing = await prisma.maintenanceWindow.findFirst({
        where: { id: windowId, workspaceId: params.id },
    });
    if (!existing) return apiError(404, 'Maintenance window not found.');

    await prisma.maintenanceWindow.delete({
        where: { id: windowId },
    });

    // Audit log
    await prisma.auditLog.create({
        data: {
            workspaceId: params.id,
            userId: user.id,
            action: 'maintenance.deleted',
            resourceType: 'maintenanceWindow',
            resourceId: windowId,
            details: { title: existing.title },
        },
    });

    return apiSuccess({ deleted: true }, { message: 'Maintenance window deleted.' });
});
