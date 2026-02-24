import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { z } from 'zod';
import { sanitizeText } from '@/lib/security/sanitize';
import { checkRateLimit } from '@/lib/security/rateLimit';

const partnerSignupSchema = z.object({
    companyName: z.string().min(2, 'Company name is required').max(100),
    businessNumber: z.string().optional(),
    website: z.string().url().optional().nullable(),
    phone: z.string().min(10).max(20).optional(),
    bio: z.string().max(1000).optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    region: z.string().max(100).optional(),
    country: z.string().length(2).default('US'),
    timezone: z.string().optional(),
    serviceRadius: z.number().int().min(0).max(500).optional(),
    remoteOnly: z.boolean().default(false),
    industries: z.array(z.string()).optional(),
    certifications: z.array(z.string()).optional(),
    languages: z.array(z.string()).default(['en']),
});

// POST /api/partners/signup - Register as a partner
export const POST = withErrorHandler(async (request: Request) => {
    const user = await requireAuth();

    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await checkRateLimit(`partner-signup-${clientIp}`, 'api');
    if (!rateLimitResult.allowed) {
        return apiError(429, 'Rate limit exceeded');
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        include: { partnerProfile: true },
    });

    if (!dbUser) return apiError(404, 'User not found');
    if (dbUser.partnerProfile) return apiError(409, 'You are already registered as a partner');

    const body = await request.json();
    const validation = partnerSignupSchema.safeParse(body);
    if (!validation.success) {
        return apiError(400, 'Validation failed', validation.error.errors);
    }

    const data = validation.data;
    const sanitizedData = {
        ...data,
        companyName: sanitizeText(data.companyName),
        bio: data.bio ? sanitizeText(data.bio) : null,
        address: data.address ? sanitizeText(data.address) : null,
    };

    const partner = await prisma.partner.create({
        data: {
            userId: dbUser.id,
            companyName: sanitizedData.companyName,
            businessNumber: sanitizedData.businessNumber,
            website: sanitizedData.website,
            phone: sanitizedData.phone,
            bio: sanitizedData.bio,
            address: sanitizedData.address,
            city: sanitizedData.city,
            region: sanitizedData.region,
            country: sanitizedData.country,
            timezone: sanitizedData.timezone,
            serviceRadius: sanitizedData.serviceRadius,
            remoteOnly: sanitizedData.remoteOnly,
            industries: sanitizedData.industries || [],
            certifications: sanitizedData.certifications || [],
            languages: sanitizedData.languages,
            status: 'PENDING',
        },
    });

    return apiSuccess({ partner, message: 'Partner application submitted successfully.' }, undefined, 201);
});
