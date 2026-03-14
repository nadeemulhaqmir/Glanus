import { prisma } from '@/lib/db';
import { logError } from '@/lib/logger';
import { sendEmail } from '@/lib/email/sendgrid';
import { getInvitationEmailTemplate } from '@/lib/email/templates';
import { randomBytes } from 'crypto';

export interface InviteInput {
    email: string;
    role: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

/**
 * InvitationService — Full workspace invitation lifecycle.
 *
 * Responsibilities (admin side):
 *  - listInvitations: fetch all PENDING invitations for a workspace
 *  - createInvitation: validate, create, and send email invite
 *  - revokeInvitation: mark invitation as REVOKED
 *
 * Responsibilities (public/token side):
 *  - verifyInvitation: validate token, check expiry, return invitation details
 *  - acceptInvitation: validate token + email match, create membership in transaction,
 *    mark invitation ACCEPTED, write audit log
 */
export class InvitationService {
    static async listInvitations(workspaceId: string) {
        return prisma.workspaceInvitation.findMany({
            where: { workspaceId, status: 'PENDING' },
            include: { inviter: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    static async createInvitation(
        workspaceId: string,
        userId: string,
        workspaceName: string,
        data: InviteInput,
    ) {
        const { email, role } = data;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            const existingMembership = await prisma.workspaceMember.findUnique({
                where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
            });
            if (existingMembership) {
                throw Object.assign(new Error('User is already a member of this workspace'), { statusCode: 409 });
            }
        }

        const existingInvitation = await prisma.workspaceInvitation.findFirst({
            where: { workspaceId, email, status: 'PENDING' },
        });
        if (existingInvitation) {
            throw Object.assign(new Error('Invitation already sent to this email'), { statusCode: 409 });
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitation = await prisma.workspaceInvitation.create({
            data: { workspaceId, email, role, token, invitedBy: userId, expiresAt },
            include: {
                workspace: { select: { name: true } },
                inviter: { select: { name: true, email: true } },
            },
        });

        const inviterName = invitation.inviter?.name || invitation.inviter?.email || 'Someone';
        const inviteUrl = `${process.env.NEXTAUTH_URL}/invitations/${token}`;
        sendEmail({
            to: email,
            subject: `You've been invited to join ${workspaceName} on Glanus`,
            html: getInvitationEmailTemplate(inviterName, workspaceName, inviteUrl),
        }).catch((err: unknown) => logError('Failed to send invitation email', err));

        return { invitation, start_url: inviteUrl };
    }

    static async revokeInvitation(workspaceId: string, invitationId: string) {
        const invitation = await prisma.workspaceInvitation.findFirst({
            where: { id: invitationId, workspaceId },
        });
        if (!invitation) {
            throw Object.assign(new Error('Invitation not found'), { statusCode: 404 });
        }
        await prisma.workspaceInvitation.update({
            where: { id: invitationId },
            data: { status: 'REVOKED' },
        });
        return { revoked: true };
    }

    /**
     * Validate a token-based invitation for public display (pre-accept).
     * Marks the invitation EXPIRED if the expiry date has passed.
     */
    static async verifyInvitation(token: string) {
        const invitation = await prisma.workspaceInvitation.findUnique({
            where: { token },
            include: {
                workspace: { select: { id: true, name: true } },
                inviter: { select: { id: true, name: true, email: true } },
            },
        });

        if (!invitation) throw Object.assign(new Error('Invitation not found or has expired'), { statusCode: 404 });

        if (invitation.status !== 'PENDING') {
            throw Object.assign(
                new Error(`Invitation has already been ${invitation.status.toLowerCase()}`),
                { statusCode: 400 },
            );
        }

        if (new Date() > invitation.expiresAt) {
            await prisma.workspaceInvitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
            throw Object.assign(new Error('This invitation has expired'), { statusCode: 400 });
        }

        return {
            email: invitation.email, role: invitation.role,
            workspace: invitation.workspace, inviter: invitation.inviter,
            expiresAt: invitation.expiresAt,
        };
    }

    /**
     * Accept a token-based invitation: validate token + email match, create membership
     * in a transaction, mark invitation ACCEPTED, write audit log.
     */
    static async acceptInvitation(token: string, userEmail: string) {
        const invitation = await prisma.workspaceInvitation.findUnique({
            where: { token },
            include: { workspace: true },
        });

        if (!invitation) throw Object.assign(new Error('Invitation not found'), { statusCode: 404 });

        if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
            throw Object.assign(new Error('This invitation was sent to a different email address'), { statusCode: 403 });
        }

        if (invitation.status !== 'PENDING') {
            throw Object.assign(new Error('Invitation already used or revoked'), { statusCode: 400 });
        }

        if (new Date() > invitation.expiresAt) {
            await prisma.workspaceInvitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
            throw Object.assign(new Error('Invitation expired'), { statusCode: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: invitation.email } });
        if (!user) throw Object.assign(new Error('Account not found. Please sign up first.'), { statusCode: 404 });

        const existingMembership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id } },
        });
        if (existingMembership) throw Object.assign(new Error('Already a member of this workspace'), { statusCode: 409 });

        const result = await prisma.$transaction(async (tx) => {
            const membership = await tx.workspaceMember.create({
                data: { workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role },
            });
            await tx.workspaceInvitation.update({
                where: { id: invitation.id },
                data: { status: 'ACCEPTED', acceptedAt: new Date() },
            });
            return membership;
        });

        await prisma.auditLog.create({
            data: {
                workspaceId: invitation.workspaceId, userId: user.id,
                action: 'member.invited', resourceType: 'WorkspaceMember', resourceId: result.id,
                details: { role: invitation.role, invitedBy: invitation.invitedBy, acceptedVia: 'invitation_link' },
            },
        });

        return { success: true, workspace: invitation.workspace, membership: result, message: `You've joined ${invitation.workspace.name}!` };
    }
}
