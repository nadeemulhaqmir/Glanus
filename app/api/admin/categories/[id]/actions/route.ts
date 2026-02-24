import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { validateRequest } from '@/lib/validation';
import { createActionDefinitionRequestSchema } from '@/lib/schemas/dynamic-asset.schemas';
import { withErrorHandler, requireAdmin } from '@/lib/api/withAuth';

type RouteParams = {
    params: Promise<{ id: string }>;
};

// POST /api/admin/categories/[id]/actions - Add action definition to category
export const POST = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
    await requireAdmin();

    const { id: categoryId } = await params;
    const data = await validateRequest(request, createActionDefinitionRequestSchema);

    // Verify category exists
    const category = await prisma.assetCategory.findUnique({
        where: { id: categoryId },
    });

    if (!category) {
        return apiError(404, 'Category not found');
    }

    // Check if action with same slug already exists in this category
    const existingAction = await prisma.assetActionDefinition.findUnique({
        where: {
            categoryId_slug: {
                categoryId,
                slug: data.slug,
            },
        },
    });

    if (existingAction) {
        return apiError(409, 'Action with this slug already exists in category');
    }

    const action = await prisma.assetActionDefinition.create({
        data: {
            ...data,
            categoryId,
            handlerConfig: data.handlerConfig as any,
            parameters: data.parameters as any,
        },
    });

    return apiSuccess(action, undefined, 201);
});
