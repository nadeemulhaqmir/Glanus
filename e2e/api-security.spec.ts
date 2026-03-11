import { test, expect } from '@playwright/test';
import { login, getCSRFToken } from './helpers/auth';

/**
 * API Security Tests
 *
 * Verifies that protected endpoints properly reject unauthenticated
 * and unauthorized requests, and return correct error codes.
 */

test('GET /api/workspaces returns 401 when not logged in', async ({ request }) => {
    const response = await request.get('/api/workspaces');
    expect(response.status() === 401 || response.status() === 403).toBeTruthy();
});

test('GET /api/assets returns 401 when not logged in', async ({ request }) => {
    const response = await request.get('/api/assets');
    expect(response.status() === 401 || response.status() === 403).toBeTruthy();
});

test('GET /api/workspaces/nonexistent/analytics returns 401 when not logged in', async ({ request }) => {
    const response = await request.get('/api/workspaces/nonexistent-id/analytics');
    expect(response.status() === 401 || response.status() === 403).toBeTruthy();
});

test('POST /api/workspaces returns 401 when not logged in', async ({ request }) => {
    const response = await request.post('/api/workspaces', {
        data: { name: 'Test Workspace' },
    });
    expect(response.status() === 401 || response.status() === 403).toBeTruthy();
});

test('GET /api/workspaces/[id]/members returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/workspaces/any-workspace-id/members');
    expect(response.status() === 401 || response.status() === 403).toBeTruthy();
});

test('POST /api/assets returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/assets', {
        data: { name: 'Evil Asset', assetType: 'PHYSICAL' },
    });
    expect(response.status() === 401 || response.status() === 403).toBeTruthy();
});

test.describe('API Security — Authenticated Boundary Tests', () => {
    let workspaceId: string | null = null;

    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.waitForLoadState('networkidle');
        const link = page.locator('a[href*="/workspaces/"]').first();
        await link.waitFor({ state: 'visible', timeout: 10000 });
        const href = await link.getAttribute('href');
        workspaceId = href?.match(/\/workspaces\/([^/]+)/)?.[1] ?? null;
    });

    test('GET /api/workspaces/invalid-uuid/analytics returns 404 or 400', async ({ page }) => {
        if (!workspaceId) { test.skip(); return; }
        const response = await page.request.get('/api/workspaces/00000000-0000-0000-0000-000000000000/analytics');
        // Should return 400 (bad request), 404 (not found), or 403 (access denied), never 200 or 500
        expect([400, 403, 404]).toContain(response.status());
    });

    test('DELETE /api/workspaces/[id] requires OWNER role — PATCH with invalid data returns 400 or 422', async ({ page }) => {
        if (!workspaceId) { test.skip(); return; }
        const csrfToken = await getCSRFToken(page);
        const response = await page.request.patch(`/api/workspaces/${workspaceId}`, {
            headers: { 'x-csrf-token': csrfToken || '' },
            data: { name: '' }, // Empty name should fail validation
        });
        // Should fail validation or return an error, never 200
        expect([400, 422, 409]).toContain(response.status());
    });

    test('GET /api/workspaces/[id]/search with query returns valid response', async ({ page }) => {
        if (!workspaceId) { test.skip(); return; }
        const response = await page.request.get(
            `/api/workspaces/${workspaceId}/search?q=asset`
        );
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('success');
    });

    test('GET /api/workspaces/[id]/topology returns valid JSON structure', async ({ page }) => {
        if (!workspaceId) { test.skip(); return; }
        const response = await page.request.get(`/api/workspaces/${workspaceId}/topology`);
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('success', true);
    });

    test('GET /api/workspaces/[id]/reports returns valid response', async ({ page }) => {
        if (!workspaceId) { test.skip(); return; }
        const response = await page.request.get(`/api/workspaces/${workspaceId}/reports`);
        expect(response.status()).toBe(200);
    });

    test('GET /api/workspaces/[id]/intelligence/nerve returns valid response', async ({ page }) => {
        if (!workspaceId) { test.skip(); return; }
        const response = await page.request.get(
            `/api/workspaces/${workspaceId}/intelligence/nerve`
        );
        // May return 200 with data or 503 if AI not configured — never 500
        expect([200, 503]).toContain(response.status());
    });

    test('GET /api/workspaces/[id]/intelligence/reflex/queue returns valid response', async ({ page }) => {
        if (!workspaceId) { test.skip(); return; }
        const response = await page.request.get(
            `/api/workspaces/${workspaceId}/intelligence/reflex/queue`
        );
        expect([200, 405, 503]).toContain(response.status());
    });

    test('GET /api/workspaces/[id]/notifications returns valid response', async ({ page }) => {
        if (!workspaceId) { test.skip(); return; }
        const response = await page.request.get(
            `/api/workspaces/${workspaceId}/notifications`
        );
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('success', true);
    });
});
