/**
 * ZtnaService — Zero Trust Network Access policy management.
 *
 * Responsibilities:
 *  - listPolicies / createPolicy / updatePolicy / deletePolicy: CRUD for ZTNA access policies
 */
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const createZtnaSchema = z.object({
    isEnabled: z.boolean().default(false),
    ipWhitelist: z.string().min(3).max(1000),
    action: z.string().default('BLOCK'),
});

export const updateZtnaSchema = z.object({
    isEnabled: z.boolean().optional(),
    ipWhitelist: z.string().min(3).max(1000).optional(),
    action: z.string().optional(),
});

/**
 * ZtnaService — Zero-Trust Network Access policy management.
 *
 * Methods:
 *   - listPolicies(workspaceId)
 *   - createPolicy(workspaceId, data) — enforces 1-policy-per-workspace limit
 *   - updatePolicy(workspaceId, policyId, data)
 *   - deletePolicy(workspaceId, policyId)
 */
export class ZtnaService {

    static async listPolicies(workspaceId: string) {
        return prisma.ztnaPolicy.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
        });
    }

    static async createPolicy(workspaceId: string, data: { isEnabled: boolean; ipWhitelist: string; action: string }) {
        const existingCount = await prisma.ztnaPolicy.count({ where: { workspaceId } });
        if (existingCount > 0) {
            throw new ApiError(400, 'Only one ZTNA policy object is supported per Workspace. Please update the existing policy instead.');
        }

        return prisma.ztnaPolicy.create({
            data: { workspaceId, isEnabled: data.isEnabled, ipWhitelist: data.ipWhitelist, action: data.action },
        });
    }

    static async updatePolicy(workspaceId: string, policyId: string, data: { isEnabled?: boolean; ipWhitelist?: string; action?: string }) {
        const policy = await prisma.ztnaPolicy.findUnique({ where: { id: policyId, workspaceId } });
        if (!policy) throw new ApiError(404, 'Zero-Trust Network Policy not found');

        return prisma.ztnaPolicy.update({ where: { id: policyId }, data });
    }

    static async deletePolicy(workspaceId: string, policyId: string) {
        const policy = await prisma.ztnaPolicy.findUnique({ where: { id: policyId, workspaceId } });
        if (!policy) throw new ApiError(404, 'Zero-Trust Network Policy not found');

        await prisma.ztnaPolicy.delete({ where: { id: policyId } });
        return null;
    }
}
