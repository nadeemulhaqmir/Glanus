import { apiSuccess, apiError } from '@/lib/api/response';
import { logError } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { hashAgentToken } from '@/lib/security/agent-auth';
import { withRateLimit } from '@/lib/security/rateLimit';

const softwareSchema = z.object({
    authToken: z.string(),
    software: z.array(z.object({
        name: z.string(),
        version: z.string().optional(),
        publisher: z.string().optional(),
        installDate: z.string().optional()
            .transform(v => {
                if (!v) return undefined;
                const d = new Date(v);
                return isNaN(d.getTime()) ? undefined : d;
            }),
        sizeMB: z.number().optional()
    })).max(5000)
});

export async function POST(request: NextRequest) {
    try {
        const rateLimitResponse = await withRateLimit(request, 'api');
        if (rateLimitResponse) return rateLimitResponse;

        const body = await request.json();
        const data = softwareSchema.parse(body);

        const hashedToken = hashAgentToken(data.authToken);
        const agent = await prisma.agentConnection.findUnique({
            where: { authToken: hashedToken },
            select: { id: true, assetId: true, workspaceId: true }
        });

        if (!agent) {
            return apiError(401, 'Invalid auth token');
        }

        // Execute as a transaction: wipe old inventory, insert new inventory
        await prisma.$transaction([
            prisma.installedSoftware.deleteMany({
                where: { agentId: agent.id }
            }),
            prisma.installedSoftware.createMany({
                data: data.software.map(sw => ({
                    agentId: agent.id,
                    name: sw.name.substring(0, 255),
                    version: sw.version?.substring(0, 100) || null,
                    publisher: sw.publisher?.substring(0, 255) || null,
                    installDate: sw.installDate || null,
                    sizeMB: sw.sizeMB || null
                }))
            })
        ]);

        return apiSuccess({ count: data.software.length }, { message: 'Software inventory synchronized' });

    } catch (error: any) {
        logError('Error synchronizing agent software', error);
        if (error instanceof z.ZodError) {
            return apiError(400, 'Invalid payload', error.errors);
        }
        return apiError(500, 'Internal Server Error');
    }
}
