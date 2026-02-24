import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe/client';
import { requireAuth, requireWorkspaceRole, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';


// POST /api/workspaces/[id]/customer-portal - Create Stripe Customer Portal session
export const POST = withErrorHandler(async (
    request: Request,
    context: { params: Promise<{ id: string }> }
) => {
    const params = await context.params;
    const user = await requireAuth();

    // Only owners and admins can access billing portal
    const { workspace } = await requireWorkspaceRole(params.id, user.id, 'ADMIN');

    // Get Stripe customer ID from subscription (single source of truth)
    const subscription = await prisma.subscription.findUnique({
        where: { workspaceId: params.id },
        select: { stripeCustomerId: true },
    });

    if (!subscription?.stripeCustomerId) {
        return apiError(400, 'No billing account found. Please upgrade first.');
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${baseUrl}/workspaces/${params.id}/billing`,
    });

    return apiSuccess({ url: portalSession.url });
});
