import { logWarn } from '@/lib/logger';
/**
 * Stripe Server-Side Client
 * Configures and exports Stripe SDK for backend use
 */
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    logWarn('STRIPE_SECRET_KEY is not set. Billing features will be disabled.');
}

export const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-01-28.clover',
        typescript: true,
    })
    : null as unknown as Stripe;

/**
 * Price ID mapping for subscription plans
 */
export const PLAN_PRICE_IDS: Record<string, string> = {
    PERSONAL: process.env.STRIPE_PRICE_PERSONAL || '',
    TEAM: process.env.STRIPE_PRICE_TEAM || '',
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || '',
};

/**
 * Map Stripe price IDs back to plan names
 */
export function getPlanFromPriceId(priceId: string): string {
    for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
        if (id === priceId) return plan;
    }
    return 'FREE';
}
