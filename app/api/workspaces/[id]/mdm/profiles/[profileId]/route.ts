import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth, withErrorHandler, ApiError } from '@/lib/api/withAuth';
import { verifyWorkspaceAccess } from '@/lib/workspace/permissions';
import { MdmService } from '@/lib/services/MdmService';

export const PATCH = withErrorHandler(async (
    req: NextRequest,
    context: { params: Promise<{ id: string, profileId: string }> }
) => {
    const user = await requireAuth();
    const { id: workspaceId, profileId } = await context.params;
    const access = await verifyWorkspaceAccess(user.email, workspaceId);

    if (!access.allowed || (access.role !== 'OWNER' && access.role !== 'ADMIN')) {
        throw new ApiError(403, 'Only Workspace Admins can modify MDM profiles');
    }

    const body = await req.json();

    try {
        const profile = await MdmService.updateProfile(workspaceId, profileId, {
            name: body.name,
            description: body.description,
            platform: body.platform,
            profileType: body.profileType,
            configPayload: body.configPayload
        });

        return apiSuccess(profile, { message: 'MDM profile updated successfully' });
    } catch (error: any) {
        if (error.message.includes('not found')) {
            throw new ApiError(404, 'MDM profile not found');
        }
        throw new ApiError(500, 'Failed to update MDM profile');
    }
});

export const DELETE = withErrorHandler(async (
    req: NextRequest,
    context: { params: Promise<{ id: string, profileId: string }> }
) => {
    const user = await requireAuth();
    const { id: workspaceId, profileId } = await context.params;
    const access = await verifyWorkspaceAccess(user.email, workspaceId);

    if (!access.allowed || (access.role !== 'OWNER' && access.role !== 'ADMIN')) {
        throw new ApiError(403, 'Only Workspace Admins can delete MDM profiles');
    }

    try {
        await MdmService.deleteProfile(workspaceId, profileId);
        return apiSuccess({ deletedId: profileId }, { message: 'MDM profile deleted successfully' });
    } catch (error: any) {
        if (error.message.includes('not found')) {
            throw new ApiError(404, 'MDM profile not found');
        }
        throw new ApiError(500, 'Failed to delete MDM profile');
    }
});
