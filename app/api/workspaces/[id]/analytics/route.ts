import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceAccess, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess } from '@/lib/api/response';
import { AnalyticsService } from '@/lib/services/AnalyticsService';

// GET /api/workspaces/[id]/analytics - Get workspace analytics + mission control data
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(workspaceId, user.id);
    const analytics = await AnalyticsService.getWorkspaceAnalytics(workspaceId);
    return apiSuccess(analytics);
});
