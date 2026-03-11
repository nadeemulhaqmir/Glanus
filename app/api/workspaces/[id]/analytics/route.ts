import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceAccess, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { AnalyticsService } from '@/lib/services/AnalyticsService';

// GET /api/workspaces/[id]/analytics - Get workspace analytics + mission control data
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id: workspaceId } = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(workspaceId, user.id);

    try {
        const analytics = await AnalyticsService.getWorkspaceAnalytics(workspaceId);
        return apiSuccess(analytics);
    } catch (error: any) {
        if (error.message === 'Workspace not found') {
            return apiError(404, error.message);
        }
        return apiError(500, 'Failed to retrieve workspace analytics');
    }
});
