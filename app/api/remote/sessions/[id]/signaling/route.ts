import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api/withAuth';
import { hashAgentToken } from '@/lib/security/agent-auth';

// Define the route context parameters correctly for Next.js 15
interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/remote/sessions/[id]/signaling
export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;

        // Try to authenticate as user first
        let isAuthorized = false;
        try {
            const user = await requireAuth();
            if (user) isAuthorized = true;
        } catch {
            // Not a user, check for Agent token
            const authHeader = request.headers.get('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const hashedToken = hashAgentToken(token);

                const agent = await prisma.agentConnection.findUnique({
                    where: { authToken: hashedToken },
                });

                if (agent) {
                    // Quick verification that session belongs to agent's asset
                    const session = await prisma.remoteSession.findUnique({
                        where: { id },
                        select: { assetId: true }
                    });

                    if (session && session.assetId === agent.assetId) {
                        isAuthorized = true;
                    }
                }
            }
        }

        if (!isAuthorized) {
            return apiError(401, 'Unauthorized');
        }

        const session = await prisma.remoteSession.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                offer: true,
                answer: true,
                iceCandidates: true,
            },
        });

        if (!session) {
            return apiError(404, 'Session not found');
        }

        return apiSuccess(session);
    } catch (error: unknown) {
        return apiError(500, 'Failed to fetch signaling data', (error as Error).message);
    }
}

// PATCH /api/remote/sessions/[id]/signaling
export async function PATCH(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const body = await request.json();

        // Similar auth check logic
        let isAuthorized = false;
        let isAgent = false;

        try {
            const user = await requireAuth();
            if (user) isAuthorized = true;
        } catch {
            const authHeader = request.headers.get('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const hashedToken = hashAgentToken(token);

                const agent = await prisma.agentConnection.findUnique({
                    where: { authToken: hashedToken },
                });

                if (agent) {
                    const session = await prisma.remoteSession.findUnique({
                        where: { id },
                        select: { assetId: true }
                    });

                    if (session && session.assetId === agent.assetId) {
                        isAuthorized = true;
                        isAgent = true;
                    }
                }
            }
        }

        if (!isAuthorized) {
            return apiError(401, 'Unauthorized');
        }

        const updateData: any = {};

        if (body.offer && !isAgent) { // Agents can't set offers, only admins
            updateData.offer = body.offer;
        }

        if (body.answer && isAgent) { // Only agents set answers
            updateData.answer = body.answer;
        }

        if (body.status) {
            updateData.status = body.status;
            if (body.status === 'ENDED' || body.status === 'FAILED') {
                updateData.endedAt = new Date();
            }
        }

        if (body.iceCandidate) {
            const session = await prisma.remoteSession.findUnique({
                where: { id },
                select: { iceCandidates: true }
            });

            const existingCandidates = (session?.iceCandidates as any[]) || [];
            updateData.iceCandidates = [...existingCandidates, { ...body.iceCandidate, source: isAgent ? 'agent' : 'admin' }];
        }

        if (Object.keys(updateData).length === 0 && !body.iceCandidates) {
            return apiError(400, 'No valid signaling data provided');
        }

        const updatedSession = await prisma.remoteSession.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                status: true,
                offer: true,
                answer: true,
                iceCandidates: true,
            }
        });

        return apiSuccess(updatedSession);
    } catch (error: unknown) {
        return apiError(500, 'Failed to update signaling data', (error as Error).message);
    }
}
