/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as listAssets, POST as createAsset } from '@/app/api/assets/route';
import {
    GET as getAsset,
    PUT as updateAsset,
    DELETE as deleteAsset,
} from '@/app/api/assets/[id]/route';
import { setupTestDatabase, teardownTestDatabase } from '../../setup/test-db';
import { prisma } from '@/lib/prisma';

/**
 * Integration Tests for Asset CRUD API
 * Tests: GET, POST /api/assets
 *        GET, PUT, DELETE /api/assets/[id]
 */

describe('Asset CRUD API', () => {
    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        await prisma.auditLog.deleteMany({});
        await prisma.physicalAsset.deleteMany({});
        await prisma.digitalAsset.deleteMany({});
        await prisma.asset.deleteMany({});
        await prisma.workspaceMember.deleteMany({});
        await prisma.subscription.deleteMany({});
        await prisma.workspace.deleteMany({});
    });

    // ─── POST /api/assets ────────────────────────────────────
    describe('POST /api/assets', () => {
        it('should create a physical asset', async () => {
            const request = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test Laptop',
                    category: 'LAPTOP',
                    assetType: 'PHYSICAL',
                    manufacturer: 'Dell',
                    model: 'XPS 15',
                    serialNumber: 'SN-001',
                }),
            });

            const response = await createAsset(request);
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.name).toBe('Test Laptop');
            expect(body.data.assetType).toBe('PHYSICAL');
            expect(body.data.manufacturer).toBe('Dell');
        });

        it('should create a digital asset', async () => {
            const request = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test SaaS App',
                    category: 'SAAS_SUBSCRIPTION',
                    assetType: 'DIGITAL',
                    vendor: 'Acme Inc',
                    version: '2.0',
                }),
            });

            const response = await createAsset(request);
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.name).toBe('Test SaaS App');
            expect(body.data.assetType).toBe('DIGITAL');
        });

        it('should reject missing name', async () => {
            const request = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: 'LAPTOP',
                }),
            });

            const response = await createAsset(request);
            expect(response.status).toBe(400);
        });

        it('should reject invalid category', async () => {
            const request = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Bad Category Asset',
                    category: 'INVALID_CATEGORY',
                }),
            });

            const response = await createAsset(request);
            expect(response.status).toBe(400);
        });

        it('should reject duplicate serial number', async () => {
            // Create first asset
            const req1 = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Asset 1',
                    category: 'LAPTOP',
                    serialNumber: 'UNIQUE-SN-123',
                }),
            });
            const res1 = await createAsset(req1);
            expect(res1.status).toBe(201);

            // Try duplicate serial number
            const req2 = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Asset 2',
                    category: 'DESKTOP',
                    serialNumber: 'UNIQUE-SN-123',
                }),
            });
            const res2 = await createAsset(req2);
            expect(res2.status).toBe(409);
        });
    });

    // ─── GET /api/assets ─────────────────────────────────────
    describe('GET /api/assets', () => {
        it('should list assets with pagination', async () => {
            // Create workspace first
            const { POST: createWorkspace } = require('@/app/api/workspaces/route');
            const wsReq = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Test WS', slug: `test-ws-${Date.now()}` }),
            });
            const wsRes = await createWorkspace(wsReq);
            const { data: { workspace } } = await wsRes.json();

            // Create two assets in this workspace
            for (const name of ['Asset A', 'Asset B']) {
                await prisma.asset.create({
                    data: {
                        name,
                        assetType: 'PHYSICAL',
                        workspaceId: workspace.id,
                        assignedToId: 'test-user-id',
                        status: 'AVAILABLE',
                    },
                });
            }

            const response = await listAssets(
                new NextRequest(`http://localhost:3000/api/assets?workspaceId=${workspace.id}`)
            );
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.data.assets.length).toBe(2);
            expect(body.data.pagination).toBeDefined();
            expect(body.data.pagination.total).toBe(2);
        });

        it('should filter assets by status', async () => {
            // Create workspace
            const { POST: createWorkspace } = require('@/app/api/workspaces/route');
            const wsReq = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Filter WS', slug: `filter-ws-${Date.now()}` }),
            });
            const wsRes = await createWorkspace(wsReq);
            const { data: { workspace } } = await wsRes.json();

            // Create available asset in this workspace
            await prisma.asset.create({
                data: {
                    name: 'Available Asset',
                    assetType: 'PHYSICAL',
                    workspaceId: workspace.id,
                    assignedToId: 'test-user-id',
                    status: 'AVAILABLE',
                },
            });

            const response = await listAssets(
                new NextRequest(`http://localhost:3000/api/assets?workspaceId=${workspace.id}&status=AVAILABLE`)
            );
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.data.assets.length).toBeGreaterThanOrEqual(1);
            body.data.assets.forEach((asset: any) => {
                expect(asset.status).toBe('AVAILABLE');
            });
        });
    });

    // ─── GET /api/assets/[id] ────────────────────────────────
    describe('GET /api/assets/[id]', () => {
        it('should return asset details', async () => {
            const createReq = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Detail Asset',
                    category: 'SERVER',
                    manufacturer: 'HP',
                }),
            });
            const createRes = await createAsset(createReq);
            const { data: created } = await createRes.json();

            const response = await getAsset(
                new NextRequest(`http://localhost:3000/api/assets/${created.id}`),
                { params: Promise.resolve({ id: created.id }) }
            );
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.data.id).toBe(created.id);
            expect(body.data.name).toBe('Detail Asset');
        });

        it('should return 404 for non-existent asset', async () => {
            const response = await getAsset(
                new NextRequest('http://localhost:3000/api/assets/non-existent-id'),
                { params: Promise.resolve({ id: 'non-existent-id' }) }
            );

            expect(response.status).toBe(404);
        });
    });

    // ─── PUT /api/assets/[id] ────────────────────────────────
    describe('PUT /api/assets/[id]', () => {
        it('should update asset name', async () => {
            const createReq = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Original Name', category: 'MONITOR' }),
            });
            const createRes = await createAsset(createReq);
            const { data: created } = await createRes.json();

            const response = await updateAsset(
                new NextRequest(`http://localhost:3000/api/assets/${created.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'Updated Name' }),
                }),
                { params: Promise.resolve({ id: created.id }) }
            );
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.data.name).toBe('Updated Name');
        });

        it('should reject update to deleted asset', async () => {
            const createReq = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'To Delete', category: 'LAPTOP' }),
            });
            const createRes = await createAsset(createReq);
            const { data: created } = await createRes.json();

            // Soft delete
            await deleteAsset(
                new NextRequest(`http://localhost:3000/api/assets/${created.id}`, { method: 'DELETE' }),
                { params: Promise.resolve({ id: created.id }) }
            );

            // Try update
            const response = await updateAsset(
                new NextRequest(`http://localhost:3000/api/assets/${created.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'Should Fail' }),
                }),
                { params: Promise.resolve({ id: created.id }) }
            );

            expect(response.status).toBe(404);
        });
    });

    // ─── DELETE /api/assets/[id] ─────────────────────────────
    describe('DELETE /api/assets/[id]', () => {
        it('should soft-delete an asset', async () => {
            const createReq = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Delete Me', category: 'PRINTER' }),
            });
            const createRes = await createAsset(createReq);
            const { data: created } = await createRes.json();

            const response = await deleteAsset(
                new NextRequest(`http://localhost:3000/api/assets/${created.id}`, { method: 'DELETE' }),
                { params: Promise.resolve({ id: created.id }) }
            );

            expect(response.status).toBe(200);

            // Asset should still exist but be soft-deleted
            const dbAsset = await prisma.asset.findUnique({ where: { id: created.id } });
            expect(dbAsset).not.toBeNull();
            expect(dbAsset!.deletedAt).not.toBeNull();
            expect(dbAsset!.status).toBe('RETIRED');
        });

        it('should create audit log on delete', async () => {
            const createReq = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Audit Delete', category: 'LAPTOP' }),
            });
            const createRes = await createAsset(createReq);
            const { data: created } = await createRes.json();

            await deleteAsset(
                new NextRequest(`http://localhost:3000/api/assets/${created.id}`, { method: 'DELETE' }),
                { params: Promise.resolve({ id: created.id }) }
            );

            const audit = await prisma.auditLog.findFirst({
                where: { assetId: created.id, action: 'ASSET_DELETED' },
            });
            expect(audit).not.toBeNull();
            expect(audit!.entityType).toBe('Asset');
        });

        it('should return 404 for already-deleted asset', async () => {
            const createReq = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Double Delete', category: 'LAPTOP' }),
            });
            const createRes = await createAsset(createReq);
            const { data: created } = await createRes.json();

            // First delete
            await deleteAsset(
                new NextRequest(`http://localhost:3000/api/assets/${created.id}`, { method: 'DELETE' }),
                { params: Promise.resolve({ id: created.id }) }
            );

            // Second delete should 404
            const response = await deleteAsset(
                new NextRequest(`http://localhost:3000/api/assets/${created.id}`, { method: 'DELETE' }),
                { params: Promise.resolve({ id: created.id }) }
            );
            expect(response.status).toBe(404);
        });
    });
});
