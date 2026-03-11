import { apiSuccess, apiError } from '@/lib/api/response';
import { logError } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { hashAgentToken } from '@/lib/security/agent-auth';
import { withRateLimit } from '@/lib/security/rateLimit';

const discoverySchema = z.object({
    authToken: z.string(),
    subnet: z.string(),
    devices: z.array(z.object({
        ipAddress: z.string(),
        macAddress: z.string().optional(),
        hostname: z.string().optional(),
        deviceType: z.string().default('UNKNOWN'),
        snmpData: z.record(z.any()).optional()
    })).max(1000)
});

export async function POST(request: NextRequest) {
    try {
        const rateLimitResponse = await withRateLimit(request, 'api');
        if (rateLimitResponse) return rateLimitResponse;

        const body = await request.json();
        const data = discoverySchema.parse(body);

        const hashedToken = hashAgentToken(data.authToken);
        const agent = await prisma.agentConnection.findUnique({
            where: { authToken: hashedToken },
            select: { id: true, workspaceId: true }
        });

        if (!agent) {
            return apiError(401, 'Invalid auth token');
        }

        // 1. Log the Discovery Scan execution
        const scan = await prisma.discoveryScan.create({
            data: {
                workspaceId: agent.workspaceId,
                agentId: agent.id,
                subnet: data.subnet,
                status: 'COMPLETED',
                devicesFound: data.devices.length,
                startedAt: new Date(),
                completedAt: new Date()
            }
        });

        // 2. Upsert each discovered network device into Workspace ledger
        // Group by IP to avoid duplicates in current payload
        const uniqueDevices = Array.from(new Map(data.devices.map(d => [d.ipAddress, d])).values());

        for (const device of uniqueDevices) {
            const existing = await prisma.networkDevice.findFirst({
                where: {
                    workspaceId: agent.workspaceId,
                    ipAddress: device.ipAddress
                }
            });

            if (existing) {
                await prisma.networkDevice.update({
                    where: { id: existing.id },
                    data: {
                        macAddress: device.macAddress || existing.macAddress,
                        hostname: device.hostname || existing.hostname,
                        deviceType: device.deviceType !== 'UNKNOWN' ? device.deviceType : existing.deviceType,
                        snmpData: device.snmpData ? (device.snmpData as any) : (existing.snmpData as any),
                        lastSeen: new Date(),
                        discoveredById: agent.id
                    }
                });
            } else {
                await prisma.networkDevice.create({
                    data: {
                        workspaceId: agent.workspaceId,
                        discoveredById: agent.id,
                        ipAddress: device.ipAddress,
                        macAddress: device.macAddress || null,
                        hostname: device.hostname || null,
                        deviceType: device.deviceType,
                        snmpData: device.snmpData ? (device.snmpData as any) : undefined,
                        lastSeen: new Date()
                    }
                });
            }
        }

        return apiSuccess({ scanId: scan.id, count: uniqueDevices.length }, { message: 'Network discovery topology synchronized' });

    } catch (error: any) {
        logError('Error processing network discovery telemetry', error);
        if (error instanceof z.ZodError) {
            return apiError(400, 'Invalid discovery payload configuration', error.errors);
        }
        return apiError(500, 'Internal Server Error');
    }
}
