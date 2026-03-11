import { NextRequest } from 'next/server';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const updateProfileSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * GET /api/account
 * Get the current authenticated user's profile with workspace memberships.
 */
export const GET = withErrorHandler(async () => {
    const user = await requireAuth();

    const profile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            onboardingCompleted: true,
            workspaceMemberships: {
                select: {
                    id: true,
                    role: true,
                    joinedAt: true,
                    workspace: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { joinedAt: 'desc' },
            },
        },
    });

    if (!profile) {
        return apiError(404, 'User not found.');
    }

    return apiSuccess({ profile });
});

/**
 * PATCH /api/account
 * Update the current user's profile (name, email).
 */
export const PATCH = withErrorHandler(async (request: NextRequest) => {
    const user = await requireAuth();
    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    // If changing email, verify it's not already in use
    if (data.email && data.email !== user.email) {
        const existing = await prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existing) {
            return apiError(409, 'An account with this email already exists.');
        }
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.email !== undefined && { email: data.email }),
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            updatedAt: true,
        },
    });

    return apiSuccess({ profile: updated }, { message: 'Profile updated successfully.' });
});

/**
 * POST /api/account
 * Change the current user's password.
 * Expects body: { currentPassword, newPassword }
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
    const user = await requireAuth();
    const body = await request.json();
    const data = changePasswordSchema.parse(body);

    // Fetch the user's current password hash
    const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true },
    });

    if (!userRecord) {
        return apiError(404, 'User not found.');
    }

    // Verify current password
    const isValid = await bcrypt.compare(data.currentPassword, userRecord.password);
    if (!isValid) {
        return apiError(401, 'Current password is incorrect.');
    }

    // Prevent reusing the same password
    const isSame = await bcrypt.compare(data.newPassword, userRecord.password);
    if (isSame) {
        return apiError(400, 'New password must be different from the current password.');
    }

    // Hash and save
    const hashedPassword = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
    });

    return apiSuccess({ changed: true }, { message: 'Password changed successfully.' });
});
