import { withErrorHandler, requireAdmin, requireAuth } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { updateFieldDefinitionSchema } from '@/lib/schemas/dynamic-asset.schemas';

type RouteParams = {
    params: Promise<{ id: string }>;
};

export const PUT = withErrorHandler(async (
    request: NextRequest,
    { params }: RouteParams
) => {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const data = updateFieldDefinitionSchema.parse(body);

    // Check if field exists
    const existingField = await prisma.assetFieldDefinition.findUnique({
        where: { id },
        select: { categoryId: true, slug: true, name: true },
    });

    if (!existingField) {
        return apiError(404, 'Field definition not found');
    }

    // If slug is being updated, check for conflicts
    if (data.slug && data.slug !== existingField.slug) {
        const slugConflict = await prisma.assetFieldDefinition.findFirst({
            where: {
                categoryId: existingField.categoryId,
                slug: data.slug,
                id: { not: id },
            },
        });

        if (slugConflict) {
            return apiError(400, 'A field with this slug already exists in this category');
        }
    }

    // Update field definition
    const field = await prisma.assetFieldDefinition.update({
        where: { id },
        data: {
            ...data,
            validationRules: data.validationRules as any,
        },
    });

    const user = await requireAuth();
    await prisma.auditLog.create({
        data: {
            action: 'FIELD_UPDATED',
            resourceType: 'AssetFieldDefinition',
            resourceId: id,
            userId: user.id,
            metadata: { fieldName: field.name, previousName: existingField.name, changes: data },
        },
    });

    return apiSuccess(field);
});

export const DELETE = withErrorHandler(async (
    request: NextRequest,
    { params }: RouteParams
) => {
    await requireAdmin();
    const { id } = await params;

    // Check if field exists
    const field = await prisma.assetFieldDefinition.findUnique({
        where: { id },
        select: { id: true, name: true },
    });

    if (!field) {
        return apiError(404, 'Field definition not found');
    }

    // Check if any assets have values for this field
    const valueCount = await prisma.assetFieldValue.count({
        where: { fieldDefinitionId: id },
    });

    if (valueCount > 0) {
        return apiError(400, `Cannot delete field definition. ${valueCount} asset(s) have values for this field.`);
    }

    // Delete field definition
    await prisma.assetFieldDefinition.delete({
        where: { id },
    });

    const user = await requireAuth();
    await prisma.auditLog.create({
        data: {
            action: 'FIELD_DELETED',
            resourceType: 'AssetFieldDefinition',
            resourceId: id,
            userId: user.id,
            metadata: { fieldName: field.name },
        },
    });

    return apiSuccess({
        message: 'Field definition deleted successfully',
        deletedField: field,
    });
});
