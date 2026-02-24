import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe/client';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';

/**
 * POST /api/partners/stripe/onboard
 * 
 * Initiates Stripe Connect Express onboarding for a partner.
 * Creates a Stripe Express account (if not yet created), then returns
 * an Account Link URL that redirects the partner to Stripe's hosted
 * onboarding flow. After completion, Stripe redirects back to the app.
 */
export const POST = withErrorHandler(async (_request: NextRequest) => {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        include: { partnerProfile: true },
    });

    if (!dbUser || !dbUser.partnerProfile) {
        return apiError(404, 'Partner profile not found');
    }

    // If already fully onboarded, return existing account info
    if (dbUser.partnerProfile.stripeOnboarded) {
        return apiSuccess({
            message: 'Stripe account already connected',
            stripeAccountId: dbUser.partnerProfile.stripeAccountId,
            alreadyOnboarded: true,
        });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    let stripeAccountId = dbUser.partnerProfile.stripeAccountId;

    // Step 1: Create Stripe Express account if none exists yet
    if (!stripeAccountId) {
        const account = await stripe.accounts.create({
            type: 'express',
            email: dbUser.email,
            metadata: {
                partnerId: dbUser.partnerProfile.id,
                userId: dbUser.id,
            },
            capabilities: {
                transfers: { requested: true },
            },
            business_type: 'individual',
        });

        stripeAccountId = account.id;

        // Persist the Stripe account ID on the partner record
        await prisma.partner.update({
            where: { id: dbUser.partnerProfile.id },
            data: { stripeAccountId },
        });
    }

    // Step 2: Generate an Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${baseUrl}/partners/earnings?stripe=refresh`,
        return_url: `${baseUrl}/partners/earnings?stripe=complete`,
        type: 'account_onboarding',
    });

    return apiSuccess({
        url: accountLink.url,
        stripeAccountId,
    });
});
