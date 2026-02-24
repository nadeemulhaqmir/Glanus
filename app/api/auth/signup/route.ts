import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { withErrorHandler } from '@/lib/api/withAuth';
import { logInfo } from '@/lib/logger';
import { withRateLimit } from '@/lib/security/rateLimit';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const signupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address').transform(v => v.toLowerCase().trim()),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
    const rateLimitResponse = await withRateLimit(request, 'strict-api');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
        return apiError(400, parsed.error.errors[0].message);
    }

    const { name, email, password } = parsed.data;

    // Check for existing user
    const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });

    if (existing) {
        return apiError(409, 'An account with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role: 'USER',
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
        },
    });

    // Audit log
    await prisma.auditLog.create({
        data: {
            action: 'USER_SIGNUP',
            resourceType: 'User',
            resourceId: user.id,
            userId: user.id,
            metadata: {
                signupTime: new Date().toISOString(),
            },
        },
    });

    logInfo('New user registered', { userId: user.id, email });

    return apiSuccess(
        { user, message: 'Account created successfully' },
        undefined,
        201,
    );
});
