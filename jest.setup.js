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

// Mock global fetch for frontend component tests
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

