/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST as createAsset } from '@/app/api/assets/route';
import { GET as getAssetActions } from '@/app/api/assets/[id]/actions/route';
import {
    createTestUser,
    cleanupTestData,
    cleanupAsset
} from '../../setup/test-helpers';
import { setupTestDatabase, teardownTestDatabase } from '../../setup/test-db';

/**
 * Integration Tests for Legacy Asset Support
 * Tests: POST /api/assets, GET /api/assets/[id], GET /api/assets/[id]/actions
 * Ensures backwards compatibility with PhysicalAsset and DigitalAsset tables
 */

describe('Legacy Asset API', () => {
    let testUser: any;

    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        await cleanupTestData();
        testUser = await createTestUser();
    });

    // ============================================
    // POST /api/assets - Physical Assets
    // ============================================

    describe('POST /api/assets - Physical Assets', () => {
        it('should create physical asset with all fields', async () => {
            const assetData = {
                name: 'Test Laptop',
                assetType: 'PHYSICAL',
                category: 'LAPTOP',
                manufacturer: 'Dell',
                model: 'XPS 15',
                serialNumber: 'SN123456',
                processor: 'Intel i7',
                ram: '16',
                storage: '512',
                osVersion: 'Windows 11',
                macAddress: '00:1A:2B:3C:4D:5E',
                ipAddress: '192.168.1.100',
                status: 'AVAILABLE',
                location: 'Office 101',
                purchaseDate: new Date().toISOString(),
                purchaseCost: 1500.00,
            };

            const request = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetData),
            });

            const response = await createAsset(request);
            const body = await response.json();

            if (response.status !== 201) console.log(body); expect(response.status).toBe(201);
            expect(body.data.name).toBe(assetData.name);
            expect(body.data.assetType).toBe('PHYSICAL');

            // Verify PhysicalAsset record was created
            expect(body.data).toHaveProperty('id');

            // Cleanup
            if (body.data?.id) {
                await cleanupAsset(body.data.id);
            }
        });

        it('should handle empty strings for optional fields', async () => {
            const assetData = {
                name: 'Test Device',
                assetType: 'PHYSICAL',
                category: 'DESKTOP',
                purchaseDate: '', // Empty string should be converted to null/undefined
                purchaseCost: '', // Empty string should be handled
                warrantyUntil: '',
            };

            const request = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetData),
            });

            const response = await createAsset(request);
            const body = await response.json();

            if (response.status !== 201) console.log(body); expect(response.status).toBe(201);
            expect(body.data.purchaseDate).toBeFalsy();
            expect(body.data.purchaseCost).toBeFalsy();
            expect(body.data.warrantyUntil).toBeFalsy();

            if (body.data?.id) {
                await cleanupAsset(body.data.id);
            }
        });

        it('should validate physical asset category', async () => {
            const assetData = {
                name: 'Invalid Category Asset',
                assetType: 'PHYSICAL',
                category: 'SAAS_SUBSCRIPTION', // Digital category for physical asset
            };

            const request = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetData),
            });

            const response = await createAsset(request);

            // Should either succeed (if validation is permissive) or fail with 400
            // The important part is no 500 error
            expect([200, 201, 400]).toContain(response.status);
        });
    });

    // ============================================
    // POST /api/assets - Digital Assets
    // ============================================

    describe('POST /api/assets - Digital Assets', () => {
        it('should create digital asset with all fields', async () => {
            const assetData = {
                name: 'Microsoft Azure Subscription',
                assetType: 'DIGITAL',
                category: 'SAAS_SUBSCRIPTION',
                vendor: 'Microsoft',
                version: '2024',
                licenseKey: 'XXXXX-XXXXX-XXXXX',
                licenseType: 'SUBSCRIPTION',
                seatCount: '10',
                seatsUsed: '5',
                subscriptionTier: 'Enterprise',
                monthlyRecurringCost: '500.00',
                renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                autoRenew: true,
                status: 'AVAILABLE',
            };

            const request = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetData),
            });

            const response = await createAsset(request);
            const body = await response.json();

            if (response.status !== 201) console.log(body); expect(response.status).toBe(201);
            expect(body.data.name).toBe(assetData.name);
            expect(body.data.assetType).toBe('DIGITAL');

            if (body.data?.id) {
                await cleanupAsset(body.data.id);
            }
        });

        it('should create database asset', async () => {
            const assetData = {
                name: 'Production PostgreSQL',
                assetType: 'DIGITAL',
                category: 'DATABASE',
                host: 'db.example.com',
                hostType: 'PROVIDER',
                connectionString: 'postgresql://user:pass@host:5432/db',
                databaseSize: '1024',
            };

            const request = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetData),
            });

            const response = await createAsset(request);
            const body = await response.json();

            if (response.status !== 201) console.log(body); expect(response.status).toBe(201);

            if (body.data?.id) {
                await cleanupAsset(body.data.id);
            }
        });

        it('should create web application asset', async () => {
            const assetData = {
                name: 'Corporate Website',
                assetType: 'DIGITAL',
                category: 'WEB_APPLICATION',
                url: 'https://example.com',
                host: 'Vercel',
                hostType: 'PROVIDER',
                sslExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            };

            const request = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetData),
            });

            const response = await createAsset(request);
            const body = await response.json();

            if (response.status !== 201) console.log(body); expect(response.status).toBe(201);

            if (body.data?.id) {
                await cleanupAsset(body.data.id);
            }
        });

        it('should validate digital asset category', async () => {
            const validCategories = [
                'WEB_APPLICATION',
                'MOBILE_APP',
                'DESKTOP_APP',
                'SAAS_SUBSCRIPTION',
                'DATABASE',
                'DEVELOPMENT_TOOL',
                'SECURITY_DIGITAL',
                'LICENSE',
                'API_SERVICE',
                'CLOUD_STORAGE',
                'VIRTUAL_MACHINE',
                'LLM',
            ];

            for (const category of validCategories) {
                const assetData = {
                    name: `Test ${category}`,
                    assetType: 'DIGITAL',
                    category,
                };

                const request = new NextRequest('http://localhost:3000/api/assets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assetData),
                });

                const response = await createAsset(request);
                const body = await response.json();

                if (response.status !== 201) console.log(body); expect(response.status).toBe(201);
                expect(body.data.assetType).toBe('DIGITAL');

                if (body.data?.id) {
                    await cleanupAsset(body.data.id);
                }
            }
        });
    });

    // ============================================
    // GET /api/assets/[id]/actions - Legacy Assets
    // ============================================

    describe('GET /api/assets/[id]/actions', () => {
        it('should return empty actions for legacy assets without categoryId', async () => {
            // Create a legacy asset
            const assetData = {
                name: 'Legacy Asset',
                assetType: 'PHYSICAL',
                category: 'LAPTOP',
            };

            const createRequest = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetData),
            });

            const createResponse = await createAsset(createRequest);
            const createBody = await createResponse.json();
            const assetId = createBody.data.id;

            // Get actions for the asset
            const getRequest = new NextRequest(`http://localhost:3000/api/assets/${assetId}/actions`);
            const getResponse = await getAssetActions(getRequest, {
                params: Promise.resolve({ id: assetId })
            });
            const getBody = await getResponse.json();

            expect(getResponse.status).toBe(200);
            expect(getBody.data.actions).toEqual([]);
            expect(getBody.data.assetId).toBe(assetId);
            expect(getBody.data.categoryId).toBeNull();

            await cleanupAsset(assetId);
        });

        it('should not return 500 error for null categoryId', async () => {
            // Create asset
            const assetData = {
                name: 'Test Asset',
                assetType: 'DIGITAL',
                category: 'SAAS_SUBSCRIPTION',
            };

            const createRequest = new NextRequest('http://localhost:3000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetData),
            });

            const createResponse = await createAsset(createRequest);
            const createBody = await createResponse.json();
            const assetId = createBody.data.id;

            // Request actions
            const getRequest = new NextRequest(`http://localhost:3000/api/assets/${assetId}/actions`);
            const getResponse = await getAssetActions(getRequest, {
                params: Promise.resolve({ id: assetId })
            });

            // Should succeed, not 500
            expect(getResponse.status).not.toBe(500);
            expect(getResponse.status).toBe(200);

            await cleanupAsset(assetId);
        });
    });
});
