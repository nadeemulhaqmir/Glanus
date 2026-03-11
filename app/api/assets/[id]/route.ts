import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { updateAssetSchema } from '@/lib/schemas/asset.schemas';
import { AssetService } from '@/lib/services/AssetService';

// GET /api/assets/[id] - Get single asset
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id } = await context.params;
    const user = await requireAuth();

    try {
        const asset = await AssetService.getAssetById(id, user.id);
        return apiSuccess(asset);
    } catch (error: any) {
        if (error.message === 'Asset not found') return apiError(404, error.message);
        return apiError(500, 'Failed to fetch asset');
    }
});

// PUT /api/assets/[id] - Update asset
export const PUT = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id } = await context.params;
    const user = await requireAuth();

    const body = await request.json();
    const parsed = updateAssetSchema.safeParse(body);
    if (!parsed.success) {
        return apiError(400, parsed.error.errors[0].message);
    }

    try {
        const asset = await AssetService.updateAsset(id, user.id, parsed.data);
        return apiSuccess(asset);
    } catch (error: any) {
        if (error.message === 'Asset not found') return apiError(404, error.message);
        if (error.message.includes('already exists')) return apiError(409, error.message);
        return apiError(400, error.message);
    }
});

// DELETE /api/assets/[id] - Soft delete asset
export const DELETE = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const { id } = await context.params;
    const user = await requireAuth();

    try {
        const asset = await AssetService.deleteAsset(id, user.id);
        return apiSuccess({ message: 'Asset deleted successfully', asset });
    } catch (error: any) {
        if (error.message === 'Asset not found') return apiError(404, error.message);
        return apiError(500, 'Failed to delete asset');
    }
});

