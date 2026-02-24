import { z } from 'zod';

/**
 * Auth unlock schema (admin only)
 */
export const unlockSchema = z.object({
    email: z.string().email('Invalid email address').transform(v => v.toLowerCase().trim()),
});

/**
 * Stripe checkout schema
 */
export const checkoutSchema = z.object({
    priceId: z.string().min(1, 'Price ID is required').startsWith('price_', 'Invalid Stripe price ID format'),
});

/**
 * Agent download schema
 */
export const downloadAgentSchema = z.object({
    platform: z.enum(['windows', 'macos', 'linux'], { message: 'Platform must be windows, macos, or linux' }),
});

/**
 * Cortex intelligence query schema
 */
export const cortexQuerySchema = z.object({
    agentId: z.string().min(1, 'agentId is required'),
});

/**
 * Reflex automation rule schema
 */
export const reflexRuleSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Rule name is required').max(100),
    description: z.string().max(500).optional().default(''),
    trigger: z.object({
        type: z.string().min(1),
        conditions: z.record(z.unknown()).optional(),
    }),
    action: z.object({
        type: z.string().min(1),
        parameters: z.record(z.unknown()).optional(),
    }),
    enabled: z.boolean().default(true),
    autonomyLevel: z.enum(['notify', 'suggest', 'auto_low', 'auto_high', 'full_auto']).default('notify'),
    cooldownMinutes: z.number().int().nonnegative().default(5),
});

export type UnlockInput = z.infer<typeof unlockSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type DownloadAgentInput = z.infer<typeof downloadAgentSchema>;
export type CortexQueryInput = z.infer<typeof cortexQuerySchema>;
export type ReflexRuleInput = z.infer<typeof reflexRuleSchema>;
