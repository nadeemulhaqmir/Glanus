import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { withErrorHandler } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/security/rateLimit';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/sendgrid';
import { generateResetToken } from '@/lib/auth/password-reset';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address').transform(v => v.toLowerCase().trim()),
});

// POST /api/auth/forgot-password
export const POST = withErrorHandler(async (request: NextRequest) => {
    const rateLimitResponse = await withRateLimit(request, 'strict-api');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
        return apiError(400, parsed.error.errors[0].message);
    }

    const { email } = parsed.data;

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
        const token = generateResetToken(user.id);
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        await sendEmail({
            to: email,
            subject: 'Reset your Glanus password',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                    <h2 style="color: #f8fafc; margin-bottom: 16px;">Reset your password</h2>
                    <p style="color: #94a3b8; line-height: 1.6;">
                        We received a request to reset your password. Click the link below to set a new password:
                    </p>
                    <a href="${resetUrl}" 
                       style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: hsl(168, 100%, 45%); color: #000; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Reset Password
                    </a>
                    <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
                    </p>
                </div>
            `,
        });
    }

    // Always return success (prevents email enumeration)
    return apiSuccess({ message: 'If an account exists with that email, a reset link has been sent.' });
});
