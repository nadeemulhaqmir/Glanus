import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { hashAgentToken } from '@/lib/security/agent-auth';

// GET /api/agent/remote/active
// Called by the Tauri Agent Webview to check for pending remote sessions.
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return apiError(401, 'Unauthorized');
        }

        const token = authHeader.substring(7);
        const hashedToken = hashAgentToken(token);

        const agent = await prisma.agentConnection.findUnique({
            where: { authToken: hashedToken },
            select: { assetId: true }
        });

        if (!agent) {
            return apiError(401, 'Invalid agent token');
        }

        // Find the most recent ACTIVE session for this asset that doesn't have an answer yet.
        // Even if it has an answer, we return it so the agent can continually sync ICE candidates.
        const activeSession = await prisma.remoteSession.findFirst({
            where: {
                assetId: agent.assetId,
                status: 'ACTIVE',
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                status: true,
                offer: true,
                answer: true,
            }
        });

        if (!activeSession) {
            return apiSuccess({ session: null });
        }

        return apiSuccess({ session: activeSession });
    } catch (error: unknown) {
        return apiError(500, 'Failed to fetch active remote session', (error as Error).message);
    }
}
