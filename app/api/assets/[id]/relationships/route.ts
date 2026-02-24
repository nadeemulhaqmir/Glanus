import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createRelationshipSchema, relationshipQuerySchema } from '@/lib/schemas/dynamic-asset.schemas';

/**
 * GET /api/assets/{id}/relationships
 * Get all relationships for an asset
 */
export const GET = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    await requireAuth();
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);

    // Validate query params
    const query = relationshipQuerySchema.parse({
        assetId: id,
        relationshipType: searchParams.get('relationshipType'),
        direction: searchParams.get('direction') || 'both',
        depth: searchParams.get('depth') || '1',
    });

    // Verify asset exists
    const asset = await prisma.asset.findUnique({
        where: { id },
        select: { id: true, name: true },
    });

    if (!asset) {
        return apiError(404, 'Asset not found');
    }

    // Build where clause based on direction
    const where: any = {
        ...(query.relationshipType && { relationshipType: query.relationshipType }),
    };

    let parentRelationships: any[] = [];
    let childRelationships: any[] = [];

    if (query.direction === 'parent' || query.direction === 'both') {
        // Asset is the child - get parent relationships
        parentRelationships = await prisma.assetRelationship.findMany({
            where: {
                ...where,
                childAssetId: id,
            },
            include: {
                parentAsset: {
                    select: {
                        id: true,
                        name: true,
                        categoryId: true,
                        category: {
                            select: {
                                name: true,
                                slug: true,
                                icon: true,
                            },
                        },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    if (query.direction === 'child' || query.direction === 'both') {
        // Asset is the parent - get child relationships
        childRelationships = await prisma.assetRelationship.findMany({
            where: {
                ...where,
                parentAssetId: id,
            },
            include: {
                childAsset: {
                    select: {
                        id: true,
                        name: true,
                        categoryId: true,
                        category: {
                            select: {
                                name: true,
                                slug: true,
                                icon: true,
                            },
                        },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    return apiSuccess({
        asset,
        relationships: {
            parent: parentRelationships.map((rel) => ({
                id: rel.id,
                relationshipType: rel.relationshipType,
                relatedAsset: rel.parentAsset,
                quantity: rel.quantity,
                position: rel.position,
                metadata: rel.metadata,
                createdBy: rel.createdBy,
                createdAt: rel.createdAt,
            })),
            child: childRelationships.map((rel) => ({
                id: rel.id,
                relationshipType: rel.relationshipType,
                relatedAsset: rel.childAsset,
                quantity: rel.quantity,
                position: rel.position,
                metadata: rel.metadata,
                createdBy: rel.createdBy,
                createdAt: rel.createdAt,
            })),
        },
        counts: {
            parent: parentRelationships.length,
            child: childRelationships.length,
            total: parentRelationships.length + childRelationships.length,
        },
    });
});

/**
 * POST /api/assets/{id}/relationships
 * Create a new relationship
 */
export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    await requireAuth();
    const { id } = await context.params;
    const body = await request.json();

    // The asset ID from the URL will be used as either parent or child
    // depending on the request body
    const data = createRelationshipSchema.parse(body);

    // Verify both assets exist
    const [parentAsset, childAsset] = await Promise.all([
        prisma.asset.findUnique({
            where: { id: data.parentAssetId },
            select: { id: true, name: true },
        }),
        prisma.asset.findUnique({
            where: { id: data.childAssetId },
            select: { id: true, name: true },
        }),
    ]);

    if (!parentAsset) {
        return apiError(404, 'Parent asset not found');
    }

    if (!childAsset) {
        return apiError(404, 'Child asset not found');
    }

    // Verify the URL asset ID matches one of the relationship assets
    if (id !== data.parentAssetId && id !== data.childAssetId) {
        return apiError(400, 'Asset ID in URL must match either parentAssetId or childAssetId');
    }

    // Check for circular relationships
    const hasCircular = await checkCircularRelationship(
        data.parentAssetId,
        data.childAssetId
    );

    if (hasCircular) {
        return apiError(400, 'Cannot create relationship: would create a circular dependency');
    }

    // Check for duplicate relationships
    const existingRelationship = await prisma.assetRelationship.findFirst({
        where: {
            parentAssetId: data.parentAssetId,
            childAssetId: data.childAssetId,
            relationshipType: data.relationshipType,
        },
    });

    if (existingRelationship) {
        return apiError(400, 'A relationship of this type already exists between these assets');
    }

    // Create the relationship
    const relationship = await prisma.assetRelationship.create({
        data: {
            parentAssetId: data.parentAssetId,
            childAssetId: data.childAssetId,
            relationshipType: data.relationshipType,
            quantity: data.quantity,
            position: data.position,
            metadata: data.metadata as any,
        },
        include: {
            parentAsset: {
                select: {
                    id: true,
                    name: true,
                    category: {
                        select: { name: true, icon: true },
                    },
                },
            },
            childAsset: {
                select: {
                    id: true,
                    name: true,
                    category: {
                        select: { name: true, icon: true },
                    },
                },
            },
        },
    });

    return apiSuccess(relationship, undefined, 201);
});

/**
 * Check if creating a relationship would cause a circular dependency
 * Returns true if childAsset is already an ancestor of parentAsset
 */
async function checkCircularRelationship(
    parentAssetId: string,
    childAssetId: string
): Promise<boolean> {
    // BFS to check if childAsset is an ancestor of parentAsset
    const visited = new Set<string>();
    const queue = [parentAssetId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;

        if (visited.has(currentId)) {
            continue;
        }

        visited.add(currentId);

        // If we find the child asset in the parent's ancestry, it's circular
        if (currentId === childAssetId) {
            return true;
        }

        // Get all parent relationships of current asset
        const parentRelationships = await prisma.assetRelationship.findMany({
            where: { childAssetId: currentId },
            select: { parentAssetId: true },
        });

        // Add all parents to the queue
        for (const rel of parentRelationships) {
            if (!visited.has(rel.parentAssetId)) {
                queue.push(rel.parentAssetId);
            }
        }
    }

    return false;
}
