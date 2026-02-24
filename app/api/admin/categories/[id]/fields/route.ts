import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { validateRequest } from '@/lib/validation';
import { createFieldDefinitionRequestSchema } from '@/lib/schemas/dynamic-asset.schemas';
import { withErrorHandler, requireAdmin } from '@/lib/api/withAuth';

type RouteParams = {
    params: Promise<{ id: string }>;
};

// GET /api/admin/categories/[id]/fields - Get all field definitions for a category
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
    await requireAdmin();

    const { id: categoryId } = await params;

    const category = await prisma.assetCategory.findUnique({
        where: { id: categoryId },
    });

    if (!category) {
        return apiError(404, 'Category not found');
    }

    const fields = await prisma.assetFieldDefinition.findMany({
        where: { categoryId },
        orderBy: { sortOrder: 'asc' },
    });

    return apiSuccess({ fields, count: fields.length });
});

// POST /api/admin/categories/[id]/fields - Add field definition to category
export const POST = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
    await requireAdmin();

    const { id: categoryId } = await params;
    const data = await validateRequest(request, createFieldDefinitionRequestSchema);

    const category = await prisma.assetCategory.findUnique({
        where: { id: categoryId },
    });

    if (!category) {
        return apiError(404, 'Category not found');
    }

    // Check if field with same slug already exists in this category
    const existingField = await prisma.assetFieldDefinition.findUnique({
        where: {
            categoryId_slug: {
                categoryId,
                slug: data.slug,
            },
        },
    });

    if (existingField) {
        return apiError(409, 'Field with this slug already exists in category');
    }

    const field = await prisma.assetFieldDefinition.create({
        data: {
            ...data,
            categoryId,
            validationRules: data.validationRules as any,
        },
    });

    return apiSuccess(field, undefined, 201);
});
