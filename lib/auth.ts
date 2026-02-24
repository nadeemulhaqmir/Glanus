import { logError } from '@/lib/logger';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import {
    logFailedLogin,
    logSuccessfulLogin,
    logAccountLockout
} from '@/lib/security/audit';

// Account lockout tracking (in-memory for now, upgrade to Redis later)
const loginAttempts = new Map<string, { count: number; lockedUntil?: Date }>();

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
const LOCKOUT_DURATION_MS = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30') * 60 * 1000;

/**
 * Check if account is locked
 */
function isAccountLocked(email: string): boolean {
    const attempts = loginAttempts.get(email);
    if (!attempts || !attempts.lockedUntil) return false;

    if (new Date() > attempts.lockedUntil) {
        // Lockout expired, reset
        loginAttempts.delete(email);
        return false;
    }

    return true;
}

/**
 * Record failed login attempt
 */
function recordFailedAttempt(email: string): number {
    const attempts = loginAttempts.get(email) || { count: 0 };
    attempts.count += 1;

    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        attempts.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }

    loginAttempts.set(email, attempts);
    return attempts.count;
}

/**
 * Reset login attempts on successful login
 */
function resetLoginAttempts(email: string): void {
    loginAttempts.delete(email);
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password required');
                }

                const email = credentials.email.toLowerCase().trim();

                // Get IP address and user agent for logging
                const ipAddress = req?.headers?.['x-forwarded-for'] as string ||
                    req?.headers?.['x-real-ip'] as string ||
                    'unknown';
                const userAgent = req?.headers?.['user-agent'] || 'unknown';

                // Check if account is locked
                if (isAccountLocked(email)) {
                    await logAccountLockout(email, ipAddress, MAX_LOGIN_ATTEMPTS);
                    throw new Error('Account is locked due to too many failed login attempts. Please try again later.');
                }

                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user || !user.password) {
                    await logFailedLogin(email, ipAddress, userAgent, 'Invalid credentials');
                    recordFailedAttempt(email);
                    throw new Error('Invalid credentials');
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    const attemptCount = recordFailedAttempt(email);
                    await logFailedLogin(
                        email,
                        ipAddress,
                        userAgent,
                        `Invalid password (attempt ${attemptCount}/${MAX_LOGIN_ATTEMPTS})`
                    );

                    if (attemptCount >= MAX_LOGIN_ATTEMPTS) {
                        await logAccountLockout(email, ipAddress, attemptCount);
                        throw new Error('Too many failed attempts. Account has been locked for 30 minutes.');
                    }

                    throw new Error('Invalid credentials');
                }

                // Successful login - reset attempts
                resetLoginAttempts(email);

                // Log successful login
                await logSuccessfulLogin(user.id, email, ipAddress, userAgent);

                // Log to audit trail
                await prisma.auditLog.create({
                    data: {
                        action: 'USER_LOGIN',
                        entityType: 'User',
                        entityId: user.id,
                        userId: user.id,
                        metadata: {
                            loginTime: new Date().toISOString(),
                            ipAddress,
                            userAgent,
                        },
                    },
                });

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            // Check if user needs onboarding
            if (url === baseUrl || url.startsWith(baseUrl + '/login')) {
                try {
                    // Get user from database to check onboarding status
                    const userEmail = (url.includes('?') ? new URL(url).searchParams.get('email') : null);
                    if (userEmail) {
                        const user = await prisma.user.findUnique({
                            where: { email: userEmail },
                            include: {
                                ownedWorkspaces: { take: 1 },
                                workspaceMemberships: { take: 1 },
                            },
                        });

                        // Redirect to onboarding if user has no workspaces and hasn't completed onboarding
                        if (user && !user.onboardingCompleted &&
                            user.ownedWorkspaces.length === 0 &&
                            user.workspaceMemberships.length === 0) {
                            return `${baseUrl}/onboarding`;
                        }
                    }
                } catch (error) {
                    logError('Redirect callback error', error);
                }
            }

            // Default behavior
            if (url.startsWith('/')) return `${baseUrl}${url}`;
            if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: parseInt(process.env.SESSION_TIMEOUT_HOURS || '24') * 60 * 60, // 24 hours default
    },
    secret: process.env.NEXTAUTH_SECRET,
};

