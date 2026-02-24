import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/assets/[id]/actions - List available actions for an asset
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    await requireAuth();
    const { id: assetId } = await context.params;

    // Get asset with its category
    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: {
            category: {
                include: {
                    actionDefinitions: {
                        orderBy: {
                            sortOrder: 'asc',
                        },
                    },
                },
            },
        },
    });

    if (!asset) {
        return apiError(404, 'Asset not found');
    }

    // Legacy assets may not have a categoryId, return empty actions list
    if (!asset.categoryId) {
        return apiSuccess({
            assetId,
            assetName: asset.name,
            categoryId: null,
            categoryName: null,
            actions: [],
        });
    }

    // Return actions from the asset's category
    const actions = asset.category?.actionDefinitions || [];

    return apiSuccess({
        assetId,
        assetName: asset.name,
        categoryId: asset.categoryId,
        categoryName: asset.category?.name,
        actions: actions.map((action) => ({
            id: action.id,
            name: action.name,
            label: action.label,
            slug: action.slug,
            description: action.description,
            icon: action.icon,
            actionType: action.actionType,
            isDestructive: action.isDestructive,
            requiresConfirmation: action.requiresConfirmation,
            estimatedDuration: action.estimatedDuration,
            buttonColor: action.buttonColor,
            parameters: action.parameters,
        })),
    });
});
