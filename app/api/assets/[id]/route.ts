import { apiSuccess } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { AssetService } from '@/lib/services/AssetService';
import { updateAssetSchema } from '@/lib/schemas/asset.schemas';

// GET /api/assets/[id] - Get single asset
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
) => {
    const { id } = await context.params;
    const user = await requireAuth();
    const asset = await AssetService.getAssetById(id, user.id);
    return apiSuccess(asset);
});

// PUT /api/assets/[id] - Update asset
export const PUT = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) => {
    const { id } = await context.params;
    const user = await requireAuth();

    const parsed = updateAssetSchema.safeParse(await request.json());
    if (!parsed.success) {
        throw Object.assign(new Error(parsed.error.errors[0].message), { statusCode: 400 });
    }

    const asset = await AssetService.updateAsset(id, user.id, parsed.data);
    return apiSuccess(asset);
});

// DELETE /api/assets/[id] - Soft delete asset
export const DELETE = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
) => {
    const { id } = await context.params;
    const user = await requireAuth();
    const asset = await AssetService.deleteAsset(id, user.id);
    return apiSuccess({ message: 'Asset deleted successfully', asset });
});
