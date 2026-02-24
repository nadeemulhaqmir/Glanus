import { PrismaClient, AssetStatus, AssetType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Clear existing data in correct order (respect foreign keys) using Postgres TRUNCATE CASCADE
    const tableNames = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
    for (const { tablename } of tableNames) {
        if (tablename !== '_prisma_migrations') {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
        }
    }

    console.log('🗑️  Cleared existing data');

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.create({
        data: {
            name: 'Admin User',
            email: 'admin@glanus.com',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });

    const user1 = await prisma.user.create({
        data: {
            name: 'John Developer',
            email: 'john@glanus.com',
            password: hashedPassword,
            role: 'USER',
        },
    });

    const user2 = await prisma.user.create({
        data: {
            name: 'Jane Designer',
            email: 'jane@glanus.com',
            password: hashedPassword,
            role: 'USER',
        },
    });

    const staff = await prisma.user.create({
        data: {
            name: 'IT Staff',
            email: 'staff@glanus.com',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });

    console.log('✅ Created users');

    // Create a Workspace for the Admin user
    const workspace = await prisma.workspace.create({
        data: {
            name: 'Acme Corporation',
            slug: 'acme-corp',
            description: 'Global manufacturing headquarters',
            ownerId: admin.id,
            subscription: {
                create: {
                    plan: 'ENTERPRISE',
                    status: 'ACTIVE',
                    maxAssets: 1000,
                    maxAICreditsPerMonth: 5000,
                    maxStorageMB: 51200,
                }
            },
            members: {
                createMany: {
                    data: [
                        { userId: admin.id, role: 'OWNER' },
                        { userId: user1.id, role: 'MEMBER' },
                        { userId: user2.id, role: 'MEMBER' },
                        { userId: staff.id, role: 'ADMIN' },
                    ]
                }
            }
        }
    });

    console.log('✅ Created Primary Workspace (Acme Corp)');

    // Create sample assets (simplified - no nested PhysicalAsset/DigitalAsset)
    const laptop1 = await prisma.asset.create({
        data: {
            assetType: 'PHYSICAL',
            name: 'MacBook Pro 16" 2023',
            description: 'High-performance laptop for development',
            workspaceId: workspace.id,
            manufacturer: 'Apple',
            model: 'MacBook Pro',
            serialNumber: 'MBP2023001',
            status: AssetStatus.ASSIGNED,
            purchaseDate: new Date('2023-06-15'),
            purchaseCost: 2499.99,
            warrantyUntil: new Date('2026-06-15'),
            location: 'Office - Floor 2',
            assignedToId: user1.id,
        },
    });

    const laptop2 = await prisma.asset.create({
        data: {
            assetType: 'PHYSICAL',
            name: 'Dell XPS 15',
            description: 'Powerful Windows laptop',
            workspaceId: workspace.id,
            manufacturer: 'Dell',
            model: 'XPS 15',
            serialNumber: 'XPS2023002',
            status: AssetStatus.ASSIGNED,
            purchaseDate: new Date('2023-08-20'),
            purchaseCost: 1899.99,
            warrantyUntil: new Date('2026-08-20'),
            location: 'Office - Floor 3',
            assignedToId: user2.id,
        },
    });

    const server = await prisma.asset.create({
        data: {
            assetType: 'PHYSICAL',
            name: 'Dell PowerEdge R740',
            description: 'Production database server',
            workspaceId: workspace.id,
            manufacturer: 'Dell',
            model: 'PowerEdge R740',
            serialNumber: 'SRV2023004',
            status: AssetStatus.ASSIGNED,
            purchaseDate: new Date('2022-03-15'),
            purchaseCost: 8999.99,
            warrantyUntil: new Date('2027-03-15'),
            location: 'Data Center - Rack A3',
            assignedToId: staff.id,
        },
    });

    const saasApp = await prisma.asset.create({
        data: {
            assetType: 'DIGITAL',
            name: 'GitHub Enterprise',
            description: 'Source code management platform',
            workspaceId: workspace.id,
            manufacturer: 'GitHub Inc.',
            serialNumber: 'GH-ENT-2023',
            status: AssetStatus.ASSIGNED,
            purchaseDate: new Date('2023-01-01'),
            purchaseCost: 21.00,
            location: 'Cloud',
            assignedToId: staff.id,
        },
    });

    const phone = await prisma.asset.create({
        data: {
            assetType: 'PHYSICAL',
            name: 'iPhone 15 Pro',
            description: 'Company mobile device',
            workspaceId: workspace.id,
            manufacturer: 'Apple',
            model: 'iPhone 15 Pro',
            serialNumber: 'IPH2024001',
            status: AssetStatus.ASSIGNED,
            purchaseDate: new Date('2024-01-10'),
            purchaseCost: 1199.99,
            warrantyUntil: new Date('2026-01-10'),
            location: 'Office - Floor 2',
            assignedToId: admin.id,
        },
    });

    console.log('✅ Created assets (5 assets: 4 physical, 1 digital)');

    console.log('');
    console.log('🎉 Database seed completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Users: 4 (2 admin, 2 regular users)`);
    console.log(`   - Workspaces: 1 (Acme Corporation)`);
    console.log(`   - Assets: 5 (4 physical, 1 digital)`);
    console.log('');
    console.log('🔐 Login credentials:');
    console.log('   Admin: admin@glanus.com / password123');
    console.log('   User:  john@glanus.com / password123');
}

main()
    .catch((e) => {
        console.error('❌ Error during seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
