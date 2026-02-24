/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as getCategories, POST as createCategory } from '@/app/api/admin/categories/route';
import { PUT as updateCategory } from '@/app/api/admin/categories/[id]/route';
import {
    createTestUser,
    createTestCategory,
    createCategoryHierarchy,
    cleanupTestData
} from '../../../setup/test-helpers';
import { setupTestDatabase, teardownTestDatabase } from '../../../setup/test-db';

/**
 * Integration Tests for Category CRUD Operations
 * Tests: POST, GET /api/admin/categories
 */

describe('Category CRUD API', () => {
    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        await cleanupTestData();
    });

    // ============================================
    // GET /api/admin/categories - List categories
    // ============================================

    describe('GET /api/admin/categories', () => {
        it('should return all categories', async () => {
            // Create test categories
            await createTestCategory({ name: 'Category 1', assetTypeValue: 'PHYSICAL' });
            await createTestCategory({ name: 'Category 2', assetTypeValue: 'DIGITAL' });

            const request = new NextRequest('http://localhost:3000/api/admin/categories');
            const response = await getCategories(request as any);
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.data.categories.length).toBeGreaterThanOrEqual(2);
            expect(body.data.categories[0]).toHaveProperty('name');
            expect(body.data.categories[0]).toHaveProperty('assetTypeValue');
        });

        it('should include hierarchy relationships', async () => {
            const { parent, child } = await createCategoryHierarchy();

            const request = new NextRequest('http://localhost:3000/api/admin/categories');
            const response = await getCategories(request as any);
            const body = await response.json();

            expect(response.status).toBe(200);
            const childCategory = body.data.categories.find((c: any) => c.id === child.id);
            expect(childCategory.parentId).toBe(parent.id);
        });

        it('should filter by type when provided', async () => {
            await createTestCategory({ name: 'Physical Category', assetTypeValue: 'PHYSICAL' });
            await createTestCategory({ name: 'Digital Category', assetTypeValue: 'DIGITAL' });

            const request = new NextRequest('http://localhost:3000/api/admin/categories?assetType=PHYSICAL');
            const response = await getCategories(request as any);
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.data.categories.length).toBeGreaterThanOrEqual(1);
            expect(body.data.categories.every((c: any) => c.assetTypeValue === 'PHYSICAL')).toBe(true);
        });
    });

    // ============================================
    // POST /api/admin/categories - Create category
    // ============================================

    describe('POST /api/admin/categories', () => {
        it('should create a category with valid data', async () => {
            const categoryData = {
                name: 'New Test Category',
                slug: 'new-test-category',
                assetTypeValue: 'PHYSICAL',
                description: 'A test category',
                icon: '💻',
                color: '#3B82F6',
            };

            const request = new NextRequest('http://localhost:3000/api/admin/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryData),
            });

            const response = await createCategory(request as any);
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.name).toBe(categoryData.name);
            expect(body.data.slug).toBe(categoryData.slug);
            expect(body.data.assetTypeValue).toBe(categoryData.assetTypeValue);
        });

        it('should reject category with missing required fields', async () => {
            const invalidData = {
                // Missing name and type
                slug: 'invalid-category',
            };

            const request = new NextRequest('http://localhost:3000/api/admin/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invalidData),
            });

            const response = await createCategory(request as any);

            expect(response.status).toBe(400);
        });

        it('should create category with valid parentId', async () => {
            const parent = await createTestCategory({ name: 'Parent' });

            const childData = {
                name: 'Child Category',
                slug: 'child-category',
                assetTypeValue: 'PHYSICAL',
                parentId: parent.id,
            };

            const request = new NextRequest('http://localhost:3000/api/admin/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(childData),
            });

            const response = await createCategory(request as any);
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.parentId).toBe(parent.id);
        });

        it('should reject category with invalid parentId', async () => {
            const invalidData = {
                name: 'Child Category',
                slug: 'child-category',
                assetTypeValue: 'PHYSICAL',
                parentId: 'non-existent-id',
            };

            const request = new NextRequest('http://localhost:3000/api/admin/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invalidData),
            });

            const response = await createCategory(request as any);

            expect(response.status).toBe(400);
        });

        it('should prevent circular hierarchy', async () => {
            const { parent, child } = await createCategoryHierarchy();

            // Try to set parent's parent to child (circular reference)
            const circularData = {
                parentId: child.id,
            };

            const request = new NextRequest(`http://localhost:3000/api/admin/categories/${parent.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(circularData),
            });

            const response = await updateCategory(request as any, {
                params: Promise.resolve({ id: parent.id }),
            });

            expect(response.status).toBe(400);
        });

        it('should auto-generate slug if not provided', async () => {
            const categoryData = {
                name: 'Auto Slug Category',
                assetTypeValue: 'PHYSICAL',
            };

            const request = new NextRequest('http://localhost:3000/api/admin/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryData),
            });

            const response = await createCategory(request as any);
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.slug).toBeTruthy();
            expect(body.data.slug.toLowerCase()).toContain('auto');
        });

        it('should set default values for optional fields', async () => {
            const minimalData = {
                name: 'Minimal Category',
                assetTypeValue: 'PHYSICAL',
            };

            const request = new NextRequest('http://localhost:3000/api/admin/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(minimalData),
            });

            const response = await createCategory(request as any);
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.isActive).toBe(true);
            expect(body.data.icon).toBeTruthy();
        });
    });
});
