/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST as createField } from '@/app/api/admin/categories/[id]/fields/route';
import {
    createTestUser,
    createTestCategory,
    createTestField,
    cleanupTestData,
    cleanupCategory
} from '../../../setup/test-helpers';
import { setupTestDatabase, teardownTestDatabase } from '../../../setup/test-db';

/**
 * Integration Tests for Field Definition Management
 * Tests: POST /api/admin/categories/[id]/fields
 */

describe('Field Definition API', () => {
    let testCategory: any;

    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        await cleanupTestData();
        testCategory = await createTestCategory();
    });

    // ============================================
    // POST /api/admin/categories/[id]/fields
    // ============================================

    describe('POST /api/admin/categories/[id]/fields', () => {
        it('should create STRING field', async () => {
            const fieldData = {
                name: 'Serial Number',
                slug: 'serial_number',
                fieldType: 'STRING',
                label: 'Serial Number',
                isRequired: true,
                validationRules: {
                    minLength: 5,
                    maxLength: 50,
                },
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${testCategory.id}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });

            const response = await createField(request, {
                params: Promise.resolve({ id: testCategory.id })
            });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.fieldType).toBe('STRING');
            expect(body.data.isRequired).toBe(true);
        });

        it('should create NUMBER field with validation', async () => {
            const fieldData = {
                name: 'RAM Size',
                slug: 'ram_size',
                fieldType: 'NUMBER',
                label: 'RAM (GB)',
                validationRules: {
                    min: 0,
                    max: 128,
                },
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${testCategory.id}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });

            const response = await createField(request, {
                params: Promise.resolve({ id: testCategory.id })
            });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.fieldType).toBe('NUMBER');
            expect(body.data.validationRules.min).toBe(0);
            expect(body.data.validationRules.max).toBe(128);
        });

        it('should create SELECT field with options', async () => {
            const fieldData = {
                name: 'Priority',
                slug: 'priority',
                fieldType: 'SELECT',
                label: 'Priority Level',
                fieldConfig: {
                    options: [
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                    ],
                },
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${testCategory.id}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });

            const response = await createField(request, {
                params: Promise.resolve({ id: testCategory.id })
            });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.fieldType).toBe('SELECT');
        });

        it('should create MULTI_SELECT field', async () => {
            const fieldData = {
                name: 'Tags',
                slug: 'tags',
                fieldType: 'MULTI_SELECT',
                label: 'Asset Tags',
                fieldConfig: {
                    options: [
                        { value: 'critical', label: 'Critical' },
                        { value: 'production', label: 'Production' },
                        { value: 'staging', label: 'Staging' },
                    ],
                },
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${testCategory.id}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });

            const response = await createField(request, {
                params: Promise.resolve({ id: testCategory.id })
            });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.fieldType).toBe('MULTI_SELECT');
        });

        it('should create DATE field', async () => {
            const fieldData = {
                name: 'Warranty Expiry',
                slug: 'warranty_expiry',
                fieldType: 'DATE',
                label: 'Warranty Expiry Date',
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${testCategory.id}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });

            const response = await createField(request, {
                params: Promise.resolve({ id: testCategory.id })
            });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.fieldType).toBe('DATE');
        });

        it('should create BOOLEAN field with default value', async () => {
            const fieldData = {
                name: 'Is Active',
                slug: 'is_active',
                fieldType: 'BOOLEAN',
                label: 'Active Status',
                defaultValue: 'true',
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${testCategory.id}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });

            const response = await createField(request, {
                params: Promise.resolve({ id: testCategory.id })
            });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.fieldType).toBe('BOOLEAN');
            expect(body.data.defaultValue).toBe('true');
        });

        it('should create URL field with validation', async () => {
            const fieldData = {
                name: 'Documentation URL',
                slug: 'documentation_url',
                fieldType: 'URL',
                label: 'Documentation Link',
                validationRules: {
                    pattern: '^https?://',
                },
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${testCategory.id}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });

            const response = await createField(request, {
                params: Promise.resolve({ id: testCategory.id })
            });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.fieldType).toBe('URL');
        });

        it('should create EMAIL field', async () => {
            const fieldData = {
                name: 'Contact Email',
                slug: 'contact_email',
                fieldType: 'EMAIL',
                label: 'Contact Email',
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${testCategory.id}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });

            const response = await createField(request, {
                params: Promise.resolve({ id: testCategory.id })
            });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.fieldType).toBe('EMAIL');
        });

        it('should create JSON field', async () => {
            const fieldData = {
                name: 'Configuration',
                slug: 'configuration',
                fieldType: 'JSON',
                label: 'Configuration Data',
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${testCategory.id}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });

            const response = await createField(request, {
                params: Promise.resolve({ id: testCategory.id })
            });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.fieldType).toBe('JSON');
        });

        it('should set field as inherited by default', async () => {
            const fieldData = {
                name: 'Test Field',
                slug: 'test_field',
                fieldType: 'STRING',
                label: 'Test',
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${testCategory.id}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });

            const response = await createField(request, {
                params: Promise.resolve({ id: testCategory.id })
            });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.isInherited).toBe(false);
        });

        it('should reject field with invalid type', async () => {
            const fieldData = {
                name: 'Invalid Field',
                slug: 'invalid_field',
                fieldType: 'INVALID_TYPE',
                label: 'Invalid',
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${testCategory.id}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });

            const response = await createField(request, {
                params: Promise.resolve({ id: testCategory.id })
            });

            expect(response.status).toBe(400);
        });

        it('should reject field with missing required properties', async () => {
            const fieldData = {
                // Missing name, slug, type
                label: 'Incomplete Field',
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${testCategory.id}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });

            const response = await createField(request, {
                params: Promise.resolve({ id: testCategory.id })
            });

            expect(response.status).toBe(400);
        });
    });
});
