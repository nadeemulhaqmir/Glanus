import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceAccess, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { AssetStatus, AssetType } from '@prisma/client';

/**
 * POST /api/workspaces/[id]/assets/import
 * Import assets from CSV data.
 * 
 * Expects multipart/form-data with a 'file' field containing CSV data.
 * CSV format: name,assetType,status,manufacturer,model,serialNumber,location,categoryName
 * 
 * Returns: { imported, skipped, errors }
 */
export const POST = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();
    await requireWorkspaceAccess(params.id, user.id);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
        return apiError(400, 'No file provided. Upload a CSV file.');
    }

    if (!file.name.endsWith('.csv')) {
        return apiError(400, 'File must be a .csv file.');
    }

    // Size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
        return apiError(400, 'File size exceeds 5MB limit.');
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

    if (lines.length < 2) {
        return apiError(400, 'CSV must have a header row and at least one data row.');
    }

    // Parse header
    const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const nameIdx = header.indexOf('name');
    if (nameIdx === -1) {
        return apiError(400, 'CSV must have a "name" column.');
    }

    const typeIdx = header.indexOf('assettype');
    const statusIdx = header.indexOf('status');
    const mfgIdx = header.indexOf('manufacturer');
    const modelIdx = header.indexOf('model');
    const serialIdx = header.indexOf('serialnumber');
    const locationIdx = header.indexOf('location');
    const categoryIdx = header.indexOf('categoryname');

    const validStatuses = Object.values(AssetStatus) as string[];
    const validTypes = Object.values(AssetType) as string[];

    // Fetch categories for name-to-id mapping (global catalog)
    const categories = await prisma.assetCategory.findMany({
        select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

    // Fetch existing serial numbers to handle duplicates
    const existingSerials = new Set<string>();
    if (serialIdx !== -1) {
        const serials = await prisma.asset.findMany({
            where: { workspaceId: params.id },
            select: { serialNumber: true },
        });
        serials.forEach(a => {
            if (a.serialNumber) existingSerials.add(a.serialNumber);
        });
    }

    const imported: Array<{ name: string; id: string }> = [];
    const skipped: Array<{ row: number; name: string; reason: string }> = [];
    const errors: Array<{ row: number; error: string }> = [];

    // Process rows in batches of 50
    const dataLines = lines.slice(1);
    const batchSize = 50;

    for (let batch = 0; batch < dataLines.length; batch += batchSize) {
        const chunk = dataLines.slice(batch, batch + batchSize);
        const createOps: Promise<void>[] = [];

        for (let i = 0; i < chunk.length; i++) {
            const rowNum = batch + i + 2; // 1-indexed, header = row 1
            const fields = parseCSVLine(chunk[i]);

            const name = fields[nameIdx]?.trim();
            if (!name) {
                errors.push({ row: rowNum, error: 'Missing name' });
                continue;
            }

            const rawType = typeIdx !== -1 ? fields[typeIdx]?.trim().toUpperCase() : 'PHYSICAL';
            const assetType = validTypes.includes(rawType) ? rawType as AssetType : AssetType.PHYSICAL;

            const rawStatus = statusIdx !== -1 ? fields[statusIdx]?.trim().toUpperCase() : 'AVAILABLE';
            const status = validStatuses.includes(rawStatus) ? rawStatus as AssetStatus : AssetStatus.AVAILABLE;

            const manufacturer = mfgIdx !== -1 ? fields[mfgIdx]?.trim() || null : null;
            const model = modelIdx !== -1 ? fields[modelIdx]?.trim() || null : null;
            const serialNumber = serialIdx !== -1 ? fields[serialIdx]?.trim() || null : null;
            const location = locationIdx !== -1 ? fields[locationIdx]?.trim() || null : null;

            // Skip duplicates by serial number
            if (serialNumber && existingSerials.has(serialNumber)) {
                skipped.push({ row: rowNum, name, reason: `Duplicate serial: ${serialNumber}` });
                continue;
            }

            // Resolve category
            let categoryId: string | undefined;
            if (categoryIdx !== -1) {
                const catName = fields[categoryIdx]?.trim().toLowerCase();
                if (catName && categoryMap.has(catName)) {
                    categoryId = categoryMap.get(catName);
                }
            }

            // Track serial to prevent in-batch duplicates
            if (serialNumber) existingSerials.add(serialNumber);

            createOps.push(
                prisma.asset.create({
                    data: {
                        name,
                        assetType,
                        status,
                        manufacturer,
                        model,
                        serialNumber,
                        location,
                        workspaceId: params.id,
                        ...(categoryId && { categoryId }),
                    },
                }).then(asset => {
                    imported.push({ name: asset.name, id: asset.id });
                }).catch(err => {
                    errors.push({ row: rowNum, error: err instanceof Error ? err.message : 'Unknown error' });
                })
            );
        }

        await Promise.all(createOps);
    }

    // Audit log
    await prisma.auditLog.create({
        data: {
            workspaceId: params.id,
            userId: user.id,
            action: 'asset.csv_import',
            resourceType: 'asset',
            resourceId: 'bulk_import',
            details: {
                fileName: file.name,
                totalRows: dataLines.length,
                imported: imported.length,
                skipped: skipped.length,
                errors: errors.length,
            },
        },
    });

    return apiSuccess({
        imported: imported.length,
        skipped: skipped.length,
        errors: errors.length,
        details: {
            imported: imported.slice(0, 20),
            skipped: skipped.slice(0, 20),
            errors: errors.slice(0, 20),
        },
    }, { message: `Import complete: ${imported.length} imported, ${skipped.length} skipped, ${errors.length} errors.` });
});

/**
 * RFC-4180 compliant CSV line parser.
 * Handles quoted fields, escaped quotes, and commas within fields.
 */
function parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                fields.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
    }
    fields.push(current);
    return fields;
}
