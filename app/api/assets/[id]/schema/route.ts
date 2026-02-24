import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveInheritedFields } from '@/lib/dynamic-fields';

/**
 * GET /api/assets/{id}/schema
 * Returns the complete schema for an asset including:
 * - Category information
 * - All field definitions (inherited + direct)
 * - All available actions
 * - Current field values
 */
export const GET = withErrorHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    await requireAuth();
    const { id } = await context.params;

    // Get asset with category
    const asset = await prisma.asset.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            categoryId: true,
            category: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    icon: true,
                    assetTypeValue: true,
                    parent: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            fieldValues: {
                select: {
                    id: true,
                    fieldDefinitionId: true,
                    valueString: true,
                    valueNumber: true,
                    valueBoolean: true,
                    valueDate: true,
                    valueJson: true,
                    fieldDefinition: {
                        select: {
                            name: true,
                            label: true,
                            slug: true,
                            fieldType: true,
                        },
                    },
                },
            },
        },
    });

    if (!asset) {
        return apiError(404, 'Asset not found');
    }

    if (!asset.categoryId) {
        return apiError(400, 'Asset does not have a dynamic category assigned');
    }

    // Resolve all fields (inherited + direct)
    const allFields = await resolveInheritedFields(asset.categoryId);

    // Get all available actions for this category
    const actions = await prisma.assetActionDefinition.findMany({
        where: {
            categoryId: asset.categoryId,
            isVisible: true,
        },
        orderBy: { sortOrder: 'asc' },
    });

    // Build field values map
    const fieldValuesMap = new Map();
    for (const fv of asset.fieldValues) {
        fieldValuesMap.set(fv.fieldDefinitionId, fv);
    }

    // Combine field definitions with current values
    const fieldsWithValues = allFields.map((field: any) => {
        const value = fieldValuesMap.get(field.id);
        return {
            ...field,
            currentValue: value
                ? {
                    id: value.id,
                    valueString: value.valueString,
                    valueNumber: value.valueNumber,
                    valueBoolean: value.valueBoolean,
                    valueDate: value.valueDate,
                    valueJson: value.valueJson,
                }
                : null,
        };
    });

    return apiSuccess({
        asset: {
            id: asset.id,
            name: asset.name,
        },
        category: asset.category,
        fields: fieldsWithValues,
        actions,
    });
});
