import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { generateAssetQRCode } from '@/lib/generateQRCode';
import { logError } from '@/lib/logger';
import { validateQuery, ValidationError, handleValidationError } from '@/lib/validation';
import { assetQuerySchema } from '@/lib/schemas/asset.schemas';
import { withRateLimit } from '@/lib/security/rateLimit';
import { verifyWorkspaceAccess } from '@/lib/workspace/utils';
import { enforceQuota, QuotaExceededError } from '@/lib/workspace/quotas';
import { auditLog } from '@/lib/workspace/auditLog';
import { validateRequest } from '@/lib/validation';
import { createAssetSchema } from '@/lib/schemas/asset.schemas';

// GET /api/assets - List assets with filtering and pagination
export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
    });
    if (!dbUser) {
        return apiError(404, 'User not found');
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    if (!workspaceId) {
        return apiError(400, 'Workspace ID required. Please select a workspace.');
    }

    const { hasAccess } = await verifyWorkspaceAccess(dbUser.id, workspaceId);
    if (!hasAccess) {
        return apiError(403, 'Access denied to workspace');
    }

    const params = validateQuery(searchParams, assetQuerySchema);
    const { page, limit, sortBy, sortOrder, search, category, status, assignedToId, assetType, location } = params;
    const skip = ((page ?? 1) - 1) * (limit ?? 20);

    const where: any = { // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma dynamic where
        workspaceId,
        deletedAt: null,
    };

    if (assetType) where.assetType = assetType;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { manufacturer: { contains: search, mode: 'insensitive' } },
            { model: { contains: search, mode: 'insensitive' } },
            { serialNumber: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (category) where.category = category;
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (location) where.location = { contains: location, mode: 'insensitive' };

    const total = await prisma.asset.count({ where });

    const assets = await prisma.asset.findMany({
        where,
        skip,
        take: limit ?? 20,
        orderBy: { [sortBy ?? 'createdAt']: sortOrder ?? 'desc' } as Record<string, 'asc' | 'desc'>,
        include: {
            physicalAsset: true,
            digitalAsset: true,
            assignedTo: { select: { id: true, name: true, email: true } },
        },
    });

    return apiSuccess({
        assets,
        pagination: {
            page,
            limit: limit ?? 20,
            total,
            totalPages: Math.ceil(total / (limit ?? 20)),
        },
    });
});

// POST /api/assets - Create new asset
export const POST = withErrorHandler(async (request: NextRequest) => {
    const rateLimitResponse = await withRateLimit(request, 'api');
    if (rateLimitResponse) return rateLimitResponse;

    const user = await requireAuth();

    const data = await validateRequest(request, createAssetSchema);

    const workspaceId = (data as Record<string, unknown>).workspaceId as string | undefined;

    // Check for duplicate serial number (workspace-scoped)
    if (data.serialNumber && workspaceId) {
        const existing = await prisma.asset.findFirst({
            where: { serialNumber: data.serialNumber, workspaceId },
        });
        if (existing) {
            return apiError(409, 'An asset with this serial number already exists in this workspace');
        }
    }

    if (workspaceId) {
        await enforceQuota(workspaceId, 'assets');
    }

    // Verify Category Exists
    const selectedCategory = await prisma.assetCategory.findUnique({
        where: { id: data.categoryId },
        include: { fieldDefinitions: true }
    });

    if (!selectedCategory) {
        return apiError(404, 'The specified Asset Category does not exist.');
    }

    // Process Custom Fields Against Definitions
    const fieldValuesPayload = [];
    if (data.customFields && Object.keys(data.customFields).length > 0) {

        // Polymorphic Helper
        const mapValToRecord = (fieldType: string, val: any) => {
            const recordParams: Record<string, any> = {};
            switch (fieldType) {
                case 'NUMBER': case 'DECIMAL': case 'CURRENCY':
                    recordParams.valueNumber = Number(val);
                    break;
                case 'BOOLEAN':
                    recordParams.valueBoolean = val === true || val === 'true';
                    break;
                case 'DATE': case 'DATETIME': case 'TIME':
                    recordParams.valueDate = new Date(val);
                    break;
                case 'JSON': case 'ARRAY':
                    try {
                        recordParams.valueJson = typeof val === 'string' ? JSON.parse(val) : val;
                    } catch {
                        recordParams.valueString = String(val); // fallback
                    }
                    break;
                default:
                    recordParams.valueString = String(val);
            }
            return recordParams;
        }

        for (const def of selectedCategory.fieldDefinitions) {
            const incomingValue = data.customFields[def.name];

            if (def.isRequired && (!incomingValue || incomingValue.toString().trim() === '')) {
                return apiError(400, `Missing required custom field: ${def.label}`);
            }

            if (incomingValue !== undefined && incomingValue !== null && incomingValue !== '') {
                fieldValuesPayload.push({
                    fieldDefinitionId: def.id,
                    ...mapValToRecord(def.fieldType, incomingValue)
                });
            }
        }
    } else {
        // Enforce required fields even if empty payload
        const missingRequired = selectedCategory.fieldDefinitions.filter((def: any) => def.isRequired);
        if (missingRequired.length > 0) {
            return apiError(400, `Missing required custom field: ${missingRequired[0].label}`);
        }
    }

    const asset = await prisma.asset.create({
        data: {
            workspaceId: workspaceId || '',
            assetType: (data.assetType || 'PHYSICAL') as any,
            name: data.name,
            categoryId: data.categoryId,
            manufacturer: data.manufacturer || null,
            model: data.model || null,
            serialNumber: data.serialNumber || null,
            status: (data.status || 'AVAILABLE') as any, // Prisma enum
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
            purchaseCost: data.purchaseCost ? parseFloat(String(data.purchaseCost)) : null,
            warrantyUntil: data.warrantyUntil ? new Date(data.warrantyUntil) : null,
            location: data.location || null,
            description: data.description || null,
            assignedToId: data.assignedToId || null,
            tags: data.tags || [],
            qrCode: null,
            fieldValues: {
                create: fieldValuesPayload
            }
        },
        include: {
            category: true,
            fieldValues: {
                include: {
                    fieldDefinition: true
                }
            },
            assignedTo: { select: { id: true, name: true, email: true } },
        },
    });

    // Generate QR code
    try {
        const qrCode = await generateAssetQRCode(asset.id, asset.name);
        await prisma.asset.update({
            where: { id: asset.id },
            data: { qrCode },
        });
        asset.qrCode = qrCode;
    } catch (qrError) {
        logError('QR code generation failed', qrError, { assetId: asset.id });
    }

    // Audit log handled by auditLog() service below

    if (workspaceId) {
        await auditLog({
            workspaceId,
            userId: user.id,
            action: 'asset.created',
            resourceType: 'Asset',
            resourceId: asset.id,
            details: { assetType: asset.assetType, name: asset.name, category: selectedCategory.name },
        });
    }

    return apiSuccess(asset, undefined, 201);
});
