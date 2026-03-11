import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { verifyWorkspaceAccess, hasWorkspacePermission } from '@/lib/workspace/permissions';
import { apiError } from '@/lib/api/response';
import { Prisma } from '@prisma/client';

export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();

    const accessResult = await verifyWorkspaceAccess(user.email, workspaceId);
    if (!accessResult.allowed) {
        return apiError(403, accessResult.error || 'Access denied');
    }
    if (!hasWorkspacePermission(accessResult!.role, 'manageSettings')) {
        return apiError(403, 'Permission denied. Must be admin or owner.');
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Prisma.AuditLogWhereInput = { workspaceId };
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (resourceType) where.resourceType = resourceType;
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            (where.createdAt as Prisma.DateTimeFilter).lte = end;
        }
    }

    const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10000, // Safety cap
        include: {
            user: { select: { name: true, email: true } },
            asset: { select: { name: true } },
        },
    });

    if (format === 'json') {
        return new Response(JSON.stringify(logs, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="audit-logs-${workspaceId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json"`,
            },
        });
    }

    // CSV
    const header = 'Timestamp,Action,Actor Name,Actor Email,Resource Type,Resource ID,Asset,IP Address,Details\n';
    const csvRows = logs.map(log => {
        const escape = (val: string | null | undefined) => {
            if (val == null) return '';
            const s = String(val).replace(/"/g, '""');
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
        };
        return [
            new Date(log.createdAt).toISOString(),
            escape(log.action),
            escape(log.user?.name),
            escape(log.user?.email),
            escape(log.resourceType),
            escape(log.resourceId),
            escape(log.asset?.name),
            escape(log.ipAddress),
            escape(log.details ? JSON.stringify(log.details) : ''),
        ].join(',');
    });

    const csv = header + csvRows.join('\n');
    return new Response(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-logs-${workspaceId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
    });
});
