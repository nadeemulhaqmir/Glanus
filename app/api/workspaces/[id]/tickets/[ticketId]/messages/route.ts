import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceAccess } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { TicketService, createMessageSchema } from '@/lib/services/TicketService';
import { z } from 'zod';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string, ticketId: string }> } | { params: { id: string, ticketId: string } }
) {
    try {
        const user = await requireAuth();
        const params = await (context.params instanceof Promise ? context.params : Promise.resolve(context.params));
        const auth = await requireWorkspaceAccess(params.id, user.id, request);

        const body = await request.json();
        const data = createMessageSchema.parse(body);

        const message = await TicketService.addMessage(params.id, params.ticketId, user, auth, data);

        return apiSuccess({ message }, { message: 'Message sent', status: 201 });

    } catch (error: any) {
        if (error instanceof z.ZodError) return apiError(400, 'Invalid payload', error.errors);

        if (error.message === 'Ticket not found') return apiError(404, error.message);
        if (error.message === 'Unauthorized' || error.message.includes('Permission denied') || error.message.includes('Access denied')) {
            return apiError(403, error.message);
        }

        return apiError(500, 'Failed to append ticket message');
    }
}
