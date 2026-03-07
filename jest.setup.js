import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            pathname: '/',
            query: {},
            asPath: '/',
        }
    },
    useSearchParams() {
        return new URLSearchParams()
    },
    usePathname() {
        return '/'
    },
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
    useSession() {
        return {
            data: {
                user: {
                    id: 'test-user-id',
                    name: 'Test User',
                    email: 'test@example.com',
                    role: 'ADMIN',
                },
            },
            status: 'authenticated',
        }
    },
    signIn: jest.fn(),
    signOut: jest.fn(),
}))

// Mock getServerSession for API routes
jest.mock('next-auth', () => ({
    getServerSession: jest.fn(() =>
        Promise.resolve({
            user: {
                id: 'test-user-id',
                name: 'Test User',
                email: 'test@example.com',
                role: 'ADMIN',
            },
        })
    ),
}))

// Mock rate limiter (requires Redis)
jest.mock('@/lib/security/rateLimit', () => ({
    withRateLimit: jest.fn(() => Promise.resolve(null)),
    checkRateLimit: jest.fn(() => Promise.resolve({ allowed: true, remaining: 99 })),
}))

// Mock isomorphic-dompurify (ESM-only, breaks in Jest)
jest.mock('isomorphic-dompurify', () => ({
    sanitize: jest.fn((input) => input),
}))

// Mock quota enforcement
jest.mock('@/lib/workspace/quotas', () => ({
    enforceQuota: jest.fn(() => Promise.resolve()),
    QuotaExceededError: class extends Error { constructor(msg) { super(msg); } },
}))

// Mock QR code generation
jest.mock('@/lib/generateQRCode', () => ({
    generateAssetQRCode: jest.fn(() => Promise.resolve('data:image/png;base64,mock')),
}))

// Mock audit logging
jest.mock('@/lib/workspace/auditLog', () => ({
    auditLog: jest.fn(() => Promise.resolve()),
}))

// Mock workspace context (used by DashboardNav, WorkspaceSwitcher, etc.)
jest.mock('@/lib/workspace/context', () => ({
    useWorkspace: jest.fn(() => ({
        workspace: {
            id: 'test-workspace-id',
            name: 'Test Workspace',
            slug: 'test-workspace',
            primaryColor: '#2563eb',
            accentColor: '#00E5C8',
            userRole: 'OWNER',
            subscription: { plan: 'TEAM', status: 'ACTIVE', maxAssets: 100, aiCreditsUsed: 0, maxAICreditsPerMonth: 1000 },
            _count: { assets: 5, members: 3 },
        },
        workspaces: [],
        isLoading: false,
        error: null,
        switchWorkspace: jest.fn(),
        refetchWorkspaces: jest.fn(),
    })),
    useWorkspacePermission: jest.fn(() => true),
    WorkspaceProvider: ({ children }) => children,
}))

// Mock toast context (used by ForgotPasswordPage, etc.)
jest.mock('@/lib/toast', () => ({
    useToast: jest.fn(() => ({
        toasts: [],
        addToast: jest.fn(),
        removeToast: jest.fn(),
        success: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
    })),
    ToastProvider: ({ children }) => children,
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
    },
}))

// Mock global fetch/Request/Response for jsdom component tests ONLY.
// In @jest-environment node, these globals exist natively and must not be
// overridden — NextRequest/NextResponse depend on the real implementations.
if (typeof globalThis.Response === 'undefined' || !globalThis.Response.json) {
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(''),
        })
    );
    global.Request = class Request {
        constructor(input, init) {
            this.url = typeof input === 'string' ? input : input.url;
            this.method = init?.method || 'GET';
            this.headers = init?.headers || {};
        }
    };
    global.Response = class Response { };
}
