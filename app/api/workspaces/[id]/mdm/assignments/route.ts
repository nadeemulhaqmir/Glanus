import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth, withErrorHandler, ApiError } from '@/lib/api/withAuth';
import { verifyWorkspaceAccess } from '@/lib/workspace/permissions';
import { MdmService } from '@/lib/services/MdmService';

export const GET = withErrorHandler(async (
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const user = await requireAuth();
    const { id: workspaceId } = await context.params;
    const access = await verifyWorkspaceAccess(user.email, workspaceId);

    if (!access.allowed) {
        throw new ApiError(403, 'Insufficient workspace permissions');
    }

    const url = new URL(req.url);
    const profileId = url.searchParams.get('profileId');

    const assignments = await MdmService.getAssignments(workspaceId, profileId);
    return apiSuccess(assignments);
});

export const POST = withErrorHandler(async (
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const user = await requireAuth();
    const { id: workspaceId } = await context.params;
    const access = await verifyWorkspaceAccess(user.email, workspaceId);

    if (!access.allowed || (access.role !== 'OWNER' && access.role !== 'ADMIN')) {
        throw new ApiError(403, 'Only Workspace Admins can assign MDM profiles');
    }

    const body = await req.json();

    if (!body.profileId || !body.assetIds || !Array.isArray(body.assetIds)) {
        throw new ApiError(400, 'Profile ID and an array of Asset IDs are required');
    }

    try {
        const assignments = await MdmService.assignProfiles(workspaceId, {
            profileId: body.profileId,
            assetIds: body.assetIds
        });
        return apiSuccess(assignments, { message: 'Profiles assigned successfully' }, 201);
    } catch (error: any) {
        if (error.message.includes('not found')) {
            throw new ApiError(404, 'MDM profile not found');
        }
        throw new ApiError(500, 'Failed to assign MDM profiles');
    }
});
