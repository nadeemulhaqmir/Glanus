/**
 * @jest-environment node
 */
/**
 * Critical Path Tests — API Response Helpers
 */

import { apiSuccess, apiError, apiCreated, apiPaginated, parsePagination } from '@/lib/api/response';

describe('API Response Helpers', () => {
    describe('apiSuccess', () => {
        it('returns standardized success response', async () => {
            const response = apiSuccess({ id: '1', name: 'Test' });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data).toEqual({ id: '1', name: 'Test' });
            expect(body.meta.timestamp).toBeDefined();
        });

        it('includes custom meta when provided', async () => {
            const response = apiSuccess({ id: '1' }, { version: '1.0' });
            const body = await response.json();

            expect(body.meta.version).toBe('1.0');
        });

        it('supports custom status codes', async () => {
            const response = apiSuccess({}, undefined, 201);
            expect(response.status).toBe(201);
        });
    });

    describe('apiError', () => {
        it('returns standardized error response', async () => {
            const response = apiError(400, 'Invalid input');
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.success).toBe(false);
            expect(body.error.code).toBe(400);
            expect(body.error.message).toBe('Invalid input');
        });

        it('includes details when provided', async () => {
            const response = apiError(422, 'Validation failed', [{ field: 'name', error: 'required' }]);
            const body = await response.json();

            expect(body.error.details).toEqual([{ field: 'name', error: 'required' }]);
        });
    });

    describe('apiCreated', () => {
        it('returns 201 status', async () => {
            const response = apiCreated({ id: '123' });
            expect(response.status).toBe(201);
        });
    });

    describe('apiPaginated', () => {
        it('returns paginated response with meta', async () => {
            const data = [{ id: '1' }, { id: '2' }];
            const response = apiPaginated(data, {
                total: 50,
                page: 1,
                pageSize: 20,
                totalPages: 3,
            });
            const body = await response.json();

            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(2);
            expect(body.meta.pagination.total).toBe(50);
            expect(body.meta.pagination.totalPages).toBe(3);
        });
    });

    describe('parsePagination', () => {
        it('parses page and pageSize from URL', () => {
            const result = parsePagination('http://localhost/api/items?page=3&pageSize=25');
            expect(result.page).toBe(3);
            expect(result.pageSize).toBe(25);
            expect(result.skip).toBe(50);
        });

        it('defaults to page 1 and pageSize 20', () => {
            const result = parsePagination('http://localhost/api/items');
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(20);
            expect(result.skip).toBe(0);
        });

        it('caps pageSize at 100', () => {
            const result = parsePagination('http://localhost/api/items?pageSize=500');
            expect(result.pageSize).toBe(100);
        });

        it('handles invalid values', () => {
            const result = parsePagination('http://localhost/api/items?page=-5&pageSize=0');
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(1);
        });
    });
});
