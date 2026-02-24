import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { validateRequest, validateQuery } from '@/lib/validation';
import {
    createCategorySchema,
    updateCategorySchema,
    categoryQuerySchema,
} from '@/lib/schemas/dynamic-asset.schemas';
import { withErrorHandler, requireAdmin } from '@/lib/api/withAuth';

// GET /api/admin/categories - List all categories
export const GET = withErrorHandler(async (request: NextRequest) => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const params = await validateQuery(searchParams, categoryQuerySchema);

    const { assetType, parentId, isActive, includeFields, includeActions, includeChildren } =
        params;

    const categories = await prisma.assetCategory.findMany({
        where: {
            ...(assetType && { assetTypeValue: assetType }),
            ...(parentId && { parentId }),
            ...(isActive !== undefined && { isActive }),
        },
        include: {
            parent: true,
            ...(includeFields && {
                fieldDefinitions: {
                    orderBy: { sortOrder: 'asc' },
                },
            }),
            ...(includeActions && {
                actionDefinitions: {
                    orderBy: { sortOrder: 'asc' },
                },
            }),
            ...(includeChildren && {
                children: {
                    orderBy: { sortOrder: 'asc' },
                },
            }),
        },
        orderBy: [{ assetTypeValue: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    return apiSuccess({
        categories,
        count: categories.length,
    });
});

// POST /api/admin/categories - Create new category
export const POST = withErrorHandler(async (request: NextRequest) => {
    await requireAdmin();

    const data = await validateRequest(request, createCategorySchema);

    // Auto-generate slug from name if not provided
    if (!data.slug) {
        data.slug = data.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    // Check if slug already exists
    const existing = await prisma.assetCategory.findUnique({
        where: { slug: data.slug },
    });

    if (existing) {
        return apiError(409, 'Category slug already exists');
    }

    // If parentId provided, verify parent exists and allows children
    if (data.parentId) {
        const parent = await prisma.assetCategory.findUnique({
            where: { id: data.parentId },
        });

        if (!parent) {
            return apiError(404, 'Parent category not found');
        }

        if (!parent.allowsChildren) {
            return apiError(400, 'Parent category does not allow children');
        }

        // Ensure child has same assetType as parent
        if (parent.assetTypeValue !== data.assetTypeValue) {
            return apiError(400, 'Child category must have same asset type as parent');
        }
    }

    const category = await prisma.assetCategory.create({
        data: {
            ...data,
            slug: data.slug!,
            metadata: data.metadata as any,
        },
        include: {
            parent: true,
            fieldDefinitions: true,
            actionDefinitions: true,
        },
    });

    await prisma.auditLog.create({
        data: {
            action: 'CATEGORY_CREATED',
            resourceType: 'AssetCategory',
            resourceId: category.id,
            userId: (await (await import('@/lib/api/withAuth')).requireAuth()).id,
            metadata: { categoryName: category.name, slug: category.slug },
        },
    });

    return apiSuccess(category, undefined, 201);
});

