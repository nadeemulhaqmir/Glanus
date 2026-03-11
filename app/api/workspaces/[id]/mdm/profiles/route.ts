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
    const platform = url.searchParams.get('platform');

    const profiles = await MdmService.getProfiles(workspaceId, platform);
    return apiSuccess(profiles);
});

export const POST = withErrorHandler(async (
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const user = await requireAuth();
    const { id: workspaceId } = await context.params;
    const access = await verifyWorkspaceAccess(user.email, workspaceId);

    if (!access.allowed || (access.role !== 'OWNER' && access.role !== 'ADMIN')) {
        throw new ApiError(403, 'Only Workspace Admins can create MDM profiles');
    }

    const body = await req.json();

    // Explicit runtime validation mapping
    if (!body.name || !body.platform || !body.profileType || !body.configPayload) {
        throw new ApiError(400, 'Missing required fields');
    }

    const profile = await MdmService.createProfile(workspaceId, {
        name: body.name,
        description: body.description,
        platform: body.platform,
        profileType: body.profileType,
        configPayload: body.configPayload,
    });

    return apiSuccess(profile, { message: 'MDM profile created successfully' }, 201);
});
