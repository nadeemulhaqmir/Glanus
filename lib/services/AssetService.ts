import { prisma } from '@/lib/db';
import { generateAssetQRCode } from '@/lib/generateQRCode';
import { logError } from '@/lib/logger';
import { enforceQuota } from '@/lib/workspace/quotas';
import { auditLog } from '@/lib/workspace/auditLog';
import { z } from 'zod';
import { createAssetSchema, assetQuerySchema, updateAssetSchema } from '@/lib/schemas/asset.schemas';

export class AssetService {
    /**
     * Fetch a paginated, filtered list of assets for a workspace.
     */
    static async getAssets(
        workspaceId: string,
        params: Partial<z.infer<typeof assetQuerySchema>>
    ) {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search, category, status, assignedToId, assetType, location } = params;
        const skip = (page - 1) * limit;

        const where: any = {
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

        const [total, assets] = await Promise.all([
            prisma.asset.count({ where }),
            prisma.asset.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder } as Record<string, 'asc' | 'desc'>,
                include: {
                    physicalAsset: true,
                    digitalAsset: true,
                    assignedTo: { select: { id: true, name: true, email: true } },
                },
            }),
        ]);

        return {
            assets,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Create a new polymorphic asset (Physical/Digital) with dynamic custom fields.
     */
    static async createAsset(
        workspaceId: string,
        userId: string,
        data: z.infer<typeof createAssetSchema>
    ) {
        // Enforce Quota Constraints limit
        await enforceQuota(workspaceId, 'assets');

        if (data.serialNumber) {
            const existing = await prisma.asset.findFirst({
                where: { serialNumber: data.serialNumber, workspaceId },
            });
            if (existing) throw new Error('An asset with this serial number already exists in this workspace');
        }

        const selectedCategory = await prisma.assetCategory.findUnique({
            where: { id: data.categoryId },
            include: { fieldDefinitions: true }
        });

        if (!selectedCategory) throw new Error('The specified Asset Category does not exist.');

        // Build Payload
        const fieldValuesPayload = [];
        if (data.customFields && Object.keys(data.customFields).length > 0) {
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
                            recordParams.valueString = String(val);
                        }
                        break;
                    default:
                        recordParams.valueString = String(val);
                }
                return recordParams;
            }

            for (const def of selectedCategory.fieldDefinitions) {
                const incomingValue = data.customFields[def.name];
                if (def.isRequired && (incomingValue === undefined || incomingValue === null || incomingValue.toString().trim() === '')) {
                    throw new Error(`Missing required custom field: ${def.label}`);
                }
                if (incomingValue !== undefined && incomingValue !== null && incomingValue !== '') {
                    fieldValuesPayload.push({
                        fieldDefinitionId: def.id,
                        ...mapValToRecord(def.fieldType, incomingValue)
                    });
                }
            }
        } else {
            const missingRequired = selectedCategory.fieldDefinitions.filter((def: any) => def.isRequired);
            if (missingRequired.length > 0) {
                throw new Error(`Missing required custom field: ${missingRequired[0].label}`);
            }
        }

        const asset = await prisma.asset.create({
            data: {
                workspaceId,
                assetType: (data.assetType || 'PHYSICAL') as any,
                name: data.name,
                categoryId: data.categoryId,
                manufacturer: data.manufacturer || null,
                model: data.model || null,
                serialNumber: data.serialNumber || null,
                status: (data.status || 'AVAILABLE') as any,
                purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
                purchaseCost: data.purchaseCost ? parseFloat(String(data.purchaseCost)) : null,
                warrantyUntil: data.warrantyUntil ? new Date(data.warrantyUntil) : null,
                location: data.location || null,
                description: data.description || null,
                assignedToId: data.assignedToId || null,
                tags: data.tags || [],
                qrCode: null,
                ...(data.assetType === 'PHYSICAL' && data.physicalAsset ? {
                    physicalAsset: {
                        create: {
                            category: (data.physicalAsset.category || 'OTHER') as any,
                            processor: data.physicalAsset.processor,
                            ram: data.physicalAsset.ram,
                            storage: data.physicalAsset.storage,
                            osVersion: data.physicalAsset.osVersion,
                            macAddress: data.physicalAsset.macAddress,
                            ipAddress: data.physicalAsset.ipAddress,
                            isManaged: data.physicalAsset.isManaged || false
                        }
                    }
                } : {}),
                ...(data.assetType === 'DIGITAL' && data.digitalAsset ? {
                    digitalAsset: {
                        create: {
                            category: (data.digitalAsset.category || 'OTHER') as any,
                            version: data.digitalAsset.version,
                            vendor: data.digitalAsset.vendor,
                            licenseKey: data.digitalAsset.licenseKey,
                            licenseType: data.digitalAsset.licenseType as any,
                            seatCount: data.digitalAsset.seatCount,
                            seatsUsed: data.digitalAsset.seatsUsed || 0,
                            subscriptionTier: data.digitalAsset.subscriptionTier,
                            monthlyRecurringCost: data.digitalAsset.monthlyRecurringCost,
                            renewalDate: data.digitalAsset.renewalDate ? new Date(data.digitalAsset.renewalDate) : null,
                            autoRenew: data.digitalAsset.autoRenew || false,
                            host: data.digitalAsset.host,
                            hostType: data.digitalAsset.hostType as any,
                            url: data.digitalAsset.url,
                            connectionString: data.digitalAsset.connectionString,
                            databaseSize: data.digitalAsset.databaseSize
                        }
                    }
                } : {}),
                fieldValues: {
                    create: fieldValuesPayload
                }
            },
            include: {
                category: true,
                physicalAsset: true,
                digitalAsset: true,
                fieldValues: {
                    include: {
                        fieldDefinition: true
                    }
                },
                assignedTo: { select: { id: true, name: true, email: true } },
            },
        });

        // Async QR Code Generation and Subsystem Side Effects
        try {
            const qrCode = await generateAssetQRCode(asset.id, asset.name);
            await prisma.asset.update({ where: { id: asset.id }, data: { qrCode } });
            asset.qrCode = qrCode;
        } catch (qrError) {
            logError('QR code generation failed', qrError, { assetId: asset.id });
        }

        await auditLog({
            workspaceId,
            userId,
            action: 'asset.created',
            resourceType: 'Asset',
            resourceId: asset.id,
            details: { assetType: asset.assetType, name: asset.name, category: selectedCategory.name },
        });

        return asset;
    }

    /**
     * Fetch a specific Asset by ID, verifying workspace access.
     */
    static async getAssetById(assetId: string, userId: string) {
        // Verify workspace membership
        const accessCheck = await prisma.asset.findFirst({
            where: {
                id: assetId,
                deletedAt: null,
                workspace: {
                    members: { some: { userId } },
                },
            },
        });

        if (!accessCheck) {
            throw new Error('Asset not found');
        }

        const asset = await prisma.asset.findFirst({
            where: { id: assetId, deletedAt: null },
            include: {
                physicalAsset: true,
                digitalAsset: true,
                assignedTo: {
                    select: { id: true, name: true, email: true, role: true },
                },
                assignmentHistory: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                    orderBy: { assignedAt: 'desc' },
                },
                remoteSessions: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                    orderBy: { startedAt: 'desc' },
                    take: 10,
                },
                aiInsights: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });

        if (!asset) {
            throw new Error('Asset not found');
        }

        return asset;
    }

    /**
     * Update an asset and its polymorphic/custom fields.
     */
    static async updateAsset(
        assetId: string,
        userId: string,
        data: z.infer<typeof updateAssetSchema> // Assuming you have this imported or defined
    ) {
        // Verify workspace membership and get current state
        const existingAsset = await prisma.asset.findFirst({
            where: {
                id: assetId,
                deletedAt: null,
                workspace: {
                    members: { some: { userId } },
                },
            },
            include: {
                category: {
                    include: { fieldDefinitions: true }
                },
                fieldValues: true
            }
        });

        if (!existingAsset) {
            throw new Error('Asset not found');
        }

        if (data.serialNumber && data.serialNumber !== existingAsset.serialNumber) {
            const duplicate = await prisma.asset.findFirst({
                where: {
                    serialNumber: data.serialNumber,
                    workspaceId: existingAsset.workspaceId,
                    id: { not: assetId },
                },
            });
            if (duplicate) {
                throw new Error('An asset with this serial number already exists');
            }
        }

        if (data.customFields && existingAsset.category) {
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
                            recordParams.valueString = String(val);
                        }
                        break;
                    default:
                        recordParams.valueString = String(val);
                }
                return recordParams;
            }

            for (const def of existingAsset.category.fieldDefinitions) {
                const incomingValue = data.customFields[def.name];
                const existingValueRecord = existingAsset.fieldValues.find((fv: any) => fv.fieldDefinitionId === def.id);

                if (incomingValue !== undefined) {
                    if (incomingValue === '' || incomingValue === null) {
                        if (def.isRequired) {
                            throw new Error(`Missing required custom field: ${def.label}`);
                        }
                        if (existingValueRecord) {
                            await prisma.assetFieldValue.delete({ where: { id: existingValueRecord.id } });
                        }
                    } else {
                        const mappedData = mapValToRecord(def.fieldType, incomingValue);
                        if (existingValueRecord) {
                            await prisma.assetFieldValue.update({
                                where: { id: existingValueRecord.id },
                                data: mappedData
                            });
                        } else {
                            await prisma.assetFieldValue.create({
                                data: {
                                    assetId,
                                    fieldDefinitionId: def.id,
                                    ...mappedData
                                }
                            });
                        }
                    }
                }
            }
        }

        const asset = await prisma.asset.update({
            where: { id: assetId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
                ...(data.manufacturer !== undefined && { manufacturer: data.manufacturer }),
                ...(data.model !== undefined && { model: data.model }),
                ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
                ...(data.status !== undefined && { status: data.status as any }),
                ...(data.purchaseDate !== undefined && { purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null }),
                ...(data.purchaseCost !== undefined && { purchaseCost: data.purchaseCost ? parseFloat(String(data.purchaseCost)) : null }),
                ...(data.warrantyUntil !== undefined && { warrantyUntil: data.warrantyUntil ? new Date(data.warrantyUntil) : null }),
                ...(data.location !== undefined && { location: data.location }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.tags !== undefined && { tags: data.tags }),

                ...(data.assetType === 'PHYSICAL' && data.physicalAsset ? {
                    physicalAsset: {
                        upsert: {
                            create: {
                                category: (data.physicalAsset.category || 'OTHER') as any,
                                processor: data.physicalAsset.processor,
                                ram: data.physicalAsset.ram,
                                storage: data.physicalAsset.storage,
                                osVersion: data.physicalAsset.osVersion,
                                macAddress: data.physicalAsset.macAddress,
                                ipAddress: data.physicalAsset.ipAddress,
                                isManaged: data.physicalAsset.isManaged || false
                            },
                            update: {
                                category: (data.physicalAsset.category || 'OTHER') as any,
                                processor: data.physicalAsset.processor,
                                ram: data.physicalAsset.ram,
                                storage: data.physicalAsset.storage,
                                osVersion: data.physicalAsset.osVersion,
                                macAddress: data.physicalAsset.macAddress,
                                ipAddress: data.physicalAsset.ipAddress,
                                isManaged: data.physicalAsset.isManaged || false
                            }
                        }
                    }
                } : {}),
                ...(data.assetType === 'DIGITAL' && data.digitalAsset ? {
                    digitalAsset: {
                        upsert: {
                            create: {
                                category: (data.digitalAsset.category || 'OTHER') as any,
                                version: data.digitalAsset.version,
                                vendor: data.digitalAsset.vendor,
                                licenseKey: data.digitalAsset.licenseKey,
                                licenseType: data.digitalAsset.licenseType as any,
                                seatCount: data.digitalAsset.seatCount,
                                seatsUsed: data.digitalAsset.seatsUsed || 0,
                                subscriptionTier: data.digitalAsset.subscriptionTier,
                                monthlyRecurringCost: data.digitalAsset.monthlyRecurringCost,
                                renewalDate: data.digitalAsset.renewalDate ? new Date(data.digitalAsset.renewalDate) : null,
                                autoRenew: data.digitalAsset.autoRenew || false,
                                host: data.digitalAsset.host,
                                hostType: data.digitalAsset.hostType as any,
                                url: data.digitalAsset.url,
                                connectionString: data.digitalAsset.connectionString,
                                databaseSize: data.digitalAsset.databaseSize
                            },
                            update: {
                                category: (data.digitalAsset.category || 'OTHER') as any,
                                version: data.digitalAsset.version,
                                vendor: data.digitalAsset.vendor,
                                licenseKey: data.digitalAsset.licenseKey,
                                licenseType: data.digitalAsset.licenseType as any,
                                seatCount: data.digitalAsset.seatCount,
                                seatsUsed: data.digitalAsset.seatsUsed || 0,
                                subscriptionTier: data.digitalAsset.subscriptionTier,
                                monthlyRecurringCost: data.digitalAsset.monthlyRecurringCost,
                                renewalDate: data.digitalAsset.renewalDate ? new Date(data.digitalAsset.renewalDate) : null,
                                autoRenew: data.digitalAsset.autoRenew || false,
                                host: data.digitalAsset.host,
                                hostType: data.digitalAsset.hostType as any,
                                url: data.digitalAsset.url,
                                connectionString: data.digitalAsset.connectionString,
                                databaseSize: data.digitalAsset.databaseSize
                            }
                        }
                    }
                } : {}),
            },
            include: {
                assignedTo: { select: { id: true, name: true, email: true } },
                physicalAsset: true,
                digitalAsset: true,
                fieldValues: {
                    include: { fieldDefinition: true }
                }
            },
        });

        await prisma.auditLog.create({
            data: {
                action: 'ASSET_UPDATED',
                resourceType: 'Asset',
                resourceId: asset.id,
                userId,
                metadata: { assetName: asset.name, changes: data },
            },
        });

        return asset;
    }

    /**
     * Soft-delete an asset.
     */
    static async deleteAsset(assetId: string, userId: string) {
        const existingAsset = await prisma.asset.findFirst({
            where: {
                id: assetId,
                deletedAt: null,
                workspace: {
                    members: { some: { userId } },
                },
            },
        });

        if (!existingAsset) {
            throw new Error('Asset not found');
        }

        const asset = await prisma.asset.update({
            where: { id: assetId },
            data: { deletedAt: new Date(), status: 'RETIRED' },
        });

        await prisma.auditLog.create({
            data: {
                action: 'ASSET_DELETED',
                resourceType: 'Asset',
                resourceId: asset.id,
                userId,
                assetId: asset.id,
                metadata: { assetName: asset.name },
            },
        });

        return asset;
    }
}
