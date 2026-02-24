/**
 * @jest-environment node
 */
/**
 * Body Size Enforcement — Unit Tests
 */

import { enforceBodySize, BODY_SIZE_LIMITS } from '@/lib/api/body-size';

// Helper to create a mock request with Content-Length
function mockRequest(contentLength?: string | null) {
    return {
        headers: {
            get(name: string) {
                if (name === 'content-length') return contentLength ?? null;
                return null;
            },
        },
    };
}

describe('enforceBodySize', () => {
    describe('json preset (1 MB)', () => {
        it('returns null when content-length is within limit', () => {
            const result = enforceBodySize(mockRequest('500000'), 'json'); // 500 KB
            expect(result).toBeNull();
        });

        it('returns error response when content-length exceeds limit', async () => {
            const result = enforceBodySize(mockRequest('2000000'), 'json'); // 2 MB
            expect(result).not.toBeNull();
            const body = await result!.json();
            expect(body.error.code).toBe(413);
        });

        it('returns null when content-length header is missing', () => {
            const result = enforceBodySize(mockRequest(null), 'json');
            expect(result).toBeNull();
        });
    });

    describe('upload preset (50 MB)', () => {
        it('accepts files under 50 MB', () => {
            const result = enforceBodySize(mockRequest('10000000'), 'upload'); // 10 MB
            expect(result).toBeNull();
        });

        it('rejects files over 50 MB', async () => {
            const bytes = String(60 * 1024 * 1024); // 60 MB
            const result = enforceBodySize(mockRequest(bytes), 'upload');
            expect(result).not.toBeNull();
        });
    });

    describe('webhook preset (256 KB)', () => {
        it('accepts small payloads', () => {
            const result = enforceBodySize(mockRequest('1000'), 'webhook');
            expect(result).toBeNull();
        });

        it('rejects oversized payloads', async () => {
            const bytes = String(512 * 1024); // 512 KB
            const result = enforceBodySize(mockRequest(bytes), 'webhook');
            expect(result).not.toBeNull();
        });
    });

    describe('custom numeric limit', () => {
        it('accepts a custom byte limit', () => {
            const result = enforceBodySize(mockRequest('100'), 5000);
            expect(result).toBeNull();
        });

        it('rejects when custom limit exceeded', () => {
            const result = enforceBodySize(mockRequest('10000'), 5000);
            expect(result).not.toBeNull();
        });
    });

    describe('BODY_SIZE_LIMITS constants', () => {
        it('has correct json limit', () => {
            expect(BODY_SIZE_LIMITS.json).toBe(1 * 1024 * 1024);
        });

        it('has correct upload limit', () => {
            expect(BODY_SIZE_LIMITS.upload).toBe(50 * 1024 * 1024);
        });

        it('has correct webhook limit', () => {
            expect(BODY_SIZE_LIMITS.webhook).toBe(256 * 1024);
        });
    });
});
