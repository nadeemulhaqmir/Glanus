import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { AssetAnalyticsService } from '@/lib/services/AssetAnalyticsService';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/assets/{id}/schema
 * Returns the complete schema for an asset including:
 * - Category information
 * - All field definitions (inherited + direct)
 * - All available actions
 * - Current field values
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteContext) => {
    await requireAuth();
    const { id: assetId } = await params;
    const result = await AssetAnalyticsService.getSchema(assetId);
    return apiSuccess(result);
});
