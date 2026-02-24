/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as listWorkspaces, POST as createWorkspace } from '@/app/api/workspaces/route';
import {
    GET as getWorkspace,
    PATCH as updateWorkspace,
    DELETE as deleteWorkspace,
} from '@/app/api/workspaces/[id]/route';
import { GET as getMembers } from '@/app/api/workspaces/[id]/members/route';
import { setupTestDatabase, teardownTestDatabase } from '../../setup/test-db';
import { prisma } from '@/lib/prisma';

/**
 * Integration Tests for Workspace API
 * Tests: GET, POST /api/workspaces
 *        GET, PATCH, DELETE /api/workspaces/[id]
 *        GET /api/workspaces/[id]/members
 */

describe('Workspace API', () => {
    let testWorkspaceId: string;

    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        // Clean up workspaces created by tests (leave system data alone)
        await prisma.workspaceMember.deleteMany({});
        await prisma.subscription.deleteMany({});
        await prisma.auditLog.deleteMany({});
        await prisma.workspace.deleteMany({});
    });

    // ─── POST /api/workspaces ────────────────────────────────
    describe('POST /api/workspaces', () => {
        it('should create a workspace with valid data', async () => {
            const request = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test Workspace',
                    slug: 'test-workspace',
                    description: 'A test workspace',
                }),
            });

            const response = await createWorkspace(request);
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.workspace).toBeDefined();
            expect(body.data.workspace.name).toBe('Test Workspace');
            expect(body.data.workspace.slug).toBe('test-workspace');
            expect(body.data.workspace.subscription).toBeDefined();
            expect(body.data.workspace.subscription.plan).toBe('FREE');

            testWorkspaceId = body.data.workspace.id;
        });

        it('should reject duplicate slug', async () => {
            // Create first workspace
            const req1 = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'First Workspace',
                    slug: 'unique-slug',
                }),
            });
            const res1 = await createWorkspace(req1);
            expect(res1.status).toBe(201);

            // Try duplicate slug
            const req2 = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Second Workspace',
                    slug: 'unique-slug',
                }),
            });
            const res2 = await createWorkspace(req2);
            expect(res2.status).toBe(409);
        });

        it('should reject invalid slug format', async () => {
            const request = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Bad Slug Workspace',
                    slug: 'Invalid Slug With Spaces!',
                }),
            });

            const response = await createWorkspace(request);
            expect(response.status).toBe(400);
        });

        it('should reject missing name', async () => {
            const request = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: 'valid-slug' }),
            });

            const response = await createWorkspace(request);
            expect(response.status).toBe(400);
        });

        it('should create workspace with TEAM plan', async () => {
            const request = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Team Workspace',
                    slug: 'team-workspace',
                    plan: 'TEAM',
                }),
            });

            const response = await createWorkspace(request);
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.data.workspace.subscription.plan).toBe('TEAM');
        });
    });

    // ─── GET /api/workspaces ─────────────────────────────────
    describe('GET /api/workspaces', () => {
        it('should list workspaces owned by user', async () => {
            // Create a workspace first
            const createReq = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'My Workspace',
                    slug: 'my-workspace',
                }),
            });
            await createWorkspace(createReq);

            // List workspaces
            const response = await listWorkspaces();
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.data.workspaces).toBeDefined();
            expect(body.data.workspaces.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ─── GET /api/workspaces/[id] ────────────────────────────
    describe('GET /api/workspaces/[id]', () => {
        it('should get workspace details', async () => {
            // Create workspace
            const createReq = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Detail Workspace',
                    slug: 'detail-workspace',
                }),
            });
            const createRes = await createWorkspace(createReq);
            const { data: { workspace: created } } = await createRes.json();

            // Get workspace
            const response = await getWorkspace(
                new NextRequest(`http://localhost:3000/api/workspaces/${created.id}`),
                { params: Promise.resolve({ id: created.id }) }
            );
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.data.workspace.id).toBe(created.id);
            expect(body.data.workspace.name).toBe('Detail Workspace');
            expect(body.data.workspace.subscription).toBeDefined();
            expect(body.data.workspace.members).toBeDefined();
        });
    });

    // ─── PATCH /api/workspaces/[id] ──────────────────────────
    describe('PATCH /api/workspaces/[id]', () => {
        it('should update workspace name', async () => {
            // Create workspace
            const createReq = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Old Name',
                    slug: 'update-workspace',
                }),
            });
            const createRes = await createWorkspace(createReq);
            const { data: { workspace: created } } = await createRes.json();

            // Update workspace
            const response = await updateWorkspace(
                new NextRequest(`http://localhost:3000/api/workspaces/${created.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'New Name' }),
                }),
                { params: Promise.resolve({ id: created.id }) }
            );
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.data.workspace.name).toBe('New Name');
        });

        it('should reject invalid color format', async () => {
            const createReq = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Color Workspace',
                    slug: 'color-workspace',
                }),
            });
            const createRes = await createWorkspace(createReq);
            const { data: { workspace: created } } = await createRes.json();

            const response = await updateWorkspace(
                new NextRequest(`http://localhost:3000/api/workspaces/${created.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ primaryColor: 'not-a-color' }),
                }),
                { params: Promise.resolve({ id: created.id }) }
            );

            expect(response.status).toBe(400);
        });
    });

    // ─── DELETE /api/workspaces/[id] ─────────────────────────
    describe('DELETE /api/workspaces/[id]', () => {
        it('should delete workspace owned by user', async () => {
            const createReq = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Delete Me',
                    slug: 'delete-me',
                }),
            });
            const createRes = await createWorkspace(createReq);
            const { data: { workspace: created } } = await createRes.json();

            const response = await deleteWorkspace(
                new NextRequest(`http://localhost:3000/api/workspaces/${created.id}`, {
                    method: 'DELETE',
                }),
                { params: Promise.resolve({ id: created.id }) }
            );

            expect(response.status).toBe(200);

            // Verify deletion
            const check = await prisma.workspace.findUnique({
                where: { id: created.id },
            });
            expect(check).toBeNull();
        });
    });

    // ─── GET /api/workspaces/[id]/members ────────────────────
    describe('GET /api/workspaces/[id]/members', () => {
        it('should list workspace members including owner', async () => {
            const createReq = new NextRequest('http://localhost:3000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Members Workspace',
                    slug: 'members-workspace',
                }),
            });
            const createRes = await createWorkspace(createReq);
            const { data: { workspace: created } } = await createRes.json();

            const response = await getMembers(
                new NextRequest(`http://localhost:3000/api/workspaces/${created.id}/members`),
                { params: Promise.resolve({ id: created.id }) }
            );
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.data.members).toBeDefined();
            expect(body.data.members.length).toBeGreaterThanOrEqual(1);
            // Owner should be in the member list
            const owner = body.data.members.find((m: any) => m.role === 'OWNER');
            expect(owner).toBeDefined();
        });
    });
});
