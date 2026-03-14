import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { AssetActionService } from '@/lib/services/AssetActionService';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/executions/{id}
 * Poll execution status
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteContext) => {
    await requireAuth();
    const { id } = await params;
    const execution = await AssetActionService.getExecution(id);
    return apiSuccess(execution);
});
