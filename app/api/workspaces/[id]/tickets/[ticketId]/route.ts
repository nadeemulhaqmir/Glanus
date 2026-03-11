import { NextRequest } from 'next/server';
import { requireAuth, requireWorkspaceAccess } from '@/lib/api/withAuth';
import { apiSuccess, apiError, apiDeleted } from '@/lib/api/response';
import { TicketService, updateTicketSchema } from '@/lib/services/TicketService';
import { z } from 'zod';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string, ticketId: string }> } | { params: { id: string, ticketId: string } }
) {
    try {
        const user = await requireAuth();
        const params = await (context.params instanceof Promise ? context.params : Promise.resolve(context.params));
        const auth = await requireWorkspaceAccess(params.id, user.id, request);

        const ticket = await TicketService.getTicketById(params.id, params.ticketId, user, auth);
        return apiSuccess({ ticket });

    } catch (error: any) {
        if (error.message === 'Ticket not found') return apiError(404, error.message);
        if (error.message === 'Access denied to this ticket' || error.message === 'Unauthorized') return apiError(403, error.message);
        return apiError(500, 'Failed to fetch ticket data');
    }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string, ticketId: string }> } | { params: { id: string, ticketId: string } }
) {
    try {
        const user = await requireAuth();
        const params = await (context.params instanceof Promise ? context.params : Promise.resolve(context.params));
        const auth = await requireWorkspaceAccess(params.id, user.id, request);

        const body = await request.json();
        const data = updateTicketSchema.parse(body);

        const updatedTicket = await TicketService.updateTicket(params.id, params.ticketId, user, auth, data);
        return apiSuccess({ ticket: updatedTicket }, { message: 'Ticket updated successfully' });

    } catch (error: any) {
        if (error instanceof z.ZodError) return apiError(400, 'Invalid payload', error.errors);
        if (error.message === 'Ticket not found') return apiError(404, error.message);
        if (error.message === 'Invalid assignee selected') return apiError(400, error.message);
        if (error.message === 'Unauthorized' || error.message.includes('Permission denied') || error.message.includes('Access denied')) {
            return apiError(403, error.message);
        }
        return apiError(500, 'Failed to update ticket');
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string, ticketId: string }> } | { params: { id: string, ticketId: string } }
) {
    try {
        const user = await requireAuth();
        const params = await (context.params instanceof Promise ? context.params : Promise.resolve(context.params));
        const auth = await requireWorkspaceAccess(params.id, user.id, request);

        await TicketService.deleteTicket(params.id, params.ticketId, user, auth);
        return apiDeleted();

    } catch (error: any) {
        if (error.message === 'Ticket not found') return apiError(404, error.message);
        if (error.message === 'Unauthorized' || error.message.includes('Insufficient permissions')) {
            return apiError(403, error.message);
        }
        return apiError(500, 'Failed to delete ticket');
    }
}
