import { withErrorHandler, requireAdmin } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { validateRequest } from '@/lib/validation';
import { updateCategorySchema } from '@/lib/schemas/dynamic-asset.schemas';
import { requireAuth } from '@/lib/api/withAuth';


type RouteParams = {
    params: Promise<{ id: string }>;
};

// GET /api/admin/categories/[id] - Get category by ID
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
    await requireAdmin();
    const { id } = await params;

    const category = await prisma.assetCategory.findUnique({
        where: { id },
        include: {
            parent: true,
            children: {
                orderBy: { sortOrder: 'asc' },
            },
            fieldDefinitions: {
                orderBy: { sortOrder: 'asc' },
            },
            actionDefinitions: {
                orderBy: { sortOrder: 'asc' },
            },
            _count: {
                select: {
                    assets: true,
                },
            },
        },
    });

    if (!category) {
        return apiError(404, 'Category not found');
    }

    return apiSuccess(category);
});

// PUT /api/admin/categories/[id] - Update category
export const PUT = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
    await requireAdmin();
    const { id } = await params;
    const data = await validateRequest(request, updateCategorySchema);

    const existing = await prisma.assetCategory.findUnique({
        where: { id },
    });

    if (!existing) {
        return apiError(404, 'Category not found');
    }

    if (data.slug && data.slug !== existing.slug) {
        const slugConflict = await prisma.assetCategory.findUnique({
            where: { slug: data.slug },
        });

        if (slugConflict) {
            return apiError(409, 'Category slug already exists');
        }
    }

    if (data.parentId !== undefined && data.parentId !== existing.parentId) {
        if (data.parentId === id) {
            return apiError(400, 'Category cannot be its own parent');
        }

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

            const wouldCreateCircle = await checkCircularReference(id, data.parentId);
            if (wouldCreateCircle) {
                return apiError(400, 'This change would create a circular reference');
            }
        }
    }

    const category = await prisma.assetCategory.update({
        where: { id },
        data: {
            ...data,
            metadata: data.metadata as any,
        },
        include: {
            parent: true,
            children: true,
            fieldDefinitions: true,
            actionDefinitions: true,
        },
    });

    const user = await requireAuth();
    await prisma.auditLog.create({
        data: {
            action: 'CATEGORY_UPDATED',
            entityType: 'AssetCategory',
            entityId: id,
            userId: user.id,
            metadata: { categoryName: category.name, changes: data } as any,
        },
    });

    return apiSuccess(category);
});

// DELETE /api/admin/categories/[id] - Delete category
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
    await requireAdmin();
    const { id } = await params;

    const category = await prisma.assetCategory.findUnique({
        where: { id },
        include: {
            children: true,
            _count: {
                select: {
                    assets: true,
                },
            },
        },
    });

    if (!category) {
        return apiError(404, 'Category not found');
    }

    if (category.children.length > 0) {
        return apiError(400, 'Cannot delete category with children. Delete children first.');
    }

    if (category._count.assets > 0) {
        return apiError(400, 'Cannot delete category with assets. Reassign or delete assets first.');
    }

    await prisma.assetCategory.delete({
        where: { id },
    });

    const user = await requireAuth();
    await prisma.auditLog.create({
        data: {
            action: 'CATEGORY_DELETED',
            entityType: 'AssetCategory',
            entityId: id,
            userId: user.id,
            metadata: { categoryName: category.name },
        },
    });

    return apiSuccess({ message: 'Category deleted successfully' });
});

// Helper function to check for circular references
async function checkCircularReference(categoryId: string, newParentId: string): Promise<boolean> {
    let currentId: string | null = newParentId;

    while (currentId) {
        if (currentId === categoryId) {
            return true; // Circular reference detected
        }

        const parent: { parentId: string | null } | null =
            await prisma.assetCategory.findUnique({
                where: { id: currentId },
                select: { parentId: true },
            });

        currentId = parent?.parentId || null;
    }

    return false;
}
