import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';

// GET /api/assets/export - Export assets to CSV
export const GET = withErrorHandler(async (_request: NextRequest) => {
    await requireAuth();

    const assets = await prisma.asset.findMany({
        where: { deletedAt: null },
        include: {
            assignedTo: { select: { name: true, email: true } },
            category: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    const headers = [
        'ID', 'Name', 'Category', 'Manufacturer', 'Model', 'Serial Number',
        'Status', 'Location', 'Assigned To', 'Assigned Email',
        'Purchase Date', 'Purchase Cost', 'Warranty Until', 'Tags',
        'Description', 'Created At',
    ];

    const rows = assets.map(asset => [
        asset.id,
        asset.name,
        asset.category?.name || '',
        asset.manufacturer || '',
        asset.model || '',
        asset.serialNumber || '',
        asset.status,
        asset.location || '',
        asset.assignedTo?.name || '',
        asset.assignedTo?.email || '',
        asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
        asset.purchaseCost || '',
        asset.warrantyUntil ? new Date(asset.warrantyUntil).toISOString().split('T')[0] : '',
        Array.isArray(asset.tags) ? asset.tags.join('; ') : '',
        asset.description?.replace(/"/g, '""') || '',
        new Date(asset.createdAt).toISOString(),
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="assets_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
    });
});
