import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Authentication Flow', () => {
    test('login with valid credentials redirects to dashboard', async ({ page }) => {
        await login(page);

        // Should be on dashboard or workspaces page
        await expect(page).toHaveURL(/\/(dashboard|workspaces)/);
    });

    test('login with invalid credentials shows error', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        await page.fill('input[type="email"], input[name="email"]', 'wrong@example.com');
        await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
        await page.click('button:has-text("Sign In"), button[type="submit"]');

        // Should stay on login page
        await page.waitForTimeout(3000);
        await expect(page).toHaveURL(/\/login/);
    });

    test('unauthenticated access to workspace redirects to login', async ({ page }) => {
        await page.goto('/workspaces/nonexistent/analytics');

        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
    });

    test('root page loads without error', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Root page should render (landing page or login)
        const content = await page.textContent('body');
        expect(content).toBeTruthy();
        // Should not show an error page
        expect(content).not.toContain('Application error');
    });
});
