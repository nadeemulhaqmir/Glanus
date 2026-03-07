import { z } from 'zod';

/**
 * Base asset schema - shared validation rules
 */
const baseAssetSchema = z.object({
    assetType: z.enum(['PHYSICAL', 'DIGITAL', 'DYNAMIC']).default('DYNAMIC'),
    name: z.string().min(1, 'Name is required').max(255),
    categoryId: z.string().min(1, 'Category ID is required'),
    manufacturer: z.string().max(255).optional(),
    model: z.string().max(255).optional(),
    serialNumber: z.string().max(255).optional(),

    // Transform empty strings to undefined for optional date fields
    purchaseDate: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
    purchaseCost: z.number().positive().optional().or(z.string().transform((val) => val === '' || val === '0' ? undefined : parseFloat(val))),
    warrantyUntil: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),

    location: z.string().max(255).optional(),
    status: z.enum(['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED', 'LOST']).optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),

    // Dynamic field payloads
    customFields: z.record(z.string(), z.string()).optional()
});

/**
 * Create asset request schema
 */
export const createAssetSchema = baseAssetSchema.extend({
    workspaceId: z.string().min(1, 'Workspace ID is required'),
    assignedToId: z.string().uuid().optional(),
});

/**
 * Update asset request schema (all fields optional)
 */
export const updateAssetSchema = baseAssetSchema.partial();

/**
 * Asset query parameters schema
 */
export const assetQuerySchema = z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    categoryId: z.string().optional(),
    status: z.string().optional(),
    assetType: z.string().optional(),
    location: z.string().optional(),
    assignedTo: z.string().optional(),
    assignedToId: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.enum(['name', 'createdAt', 'category', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Assign asset request schema
 */
export const assignAssetSchema = z.object({
    userId: z.string().uuid('Invalid user ID format'),
    notes: z.string().max(1000).optional(),
});

/**
 * Bulk operations schemas
 */
export const bulkAssignSchema = z.object({
    assetIds: z.array(z.string().uuid()).min(1, 'At least one asset ID is required'),
    userId: z.string().uuid('Invalid user ID format'),
});

export const bulkDeleteSchema = z.object({
    assetIds: z.array(z.string().uuid()).min(1, 'At least one asset ID is required'),
});

export const bulkOpsSchema = z.object({
    operation: z.enum(['DELETE', 'UPDATE', 'ASSIGN'], { message: 'operation must be DELETE, UPDATE, or ASSIGN' }),
    assetIds: z.array(z.string().uuid()).min(1, 'At least one asset ID is required'),
    data: z.object({
        status: z.enum(['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED', 'LOST']).optional(),
        location: z.string().max(255).optional(),
        assigneeId: z.string().uuid().optional(),
    }).optional(),
});

/**
 * Infer TypeScript types from schemas
 */
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssetQueryParams = z.infer<typeof assetQuerySchema>;
export type AssignAssetInput = z.infer<typeof assignAssetSchema>;
export type BulkAssignInput = z.infer<typeof bulkAssignSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
