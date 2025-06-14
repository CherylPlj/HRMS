import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimiter } from '@/lib/limiter';
import { getClientIp } from '@/lib/ip';
import { z } from 'zod';
import crypto from 'crypto';

const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
const VALID_API_KEYS = {
    'sis': process.env.SJSFI_SIS_API_KEY,
    'lms': process.env.SJSFI_LMS_API_KEY,
    // 'hrms': process.env.SJSFI_HRMS_API_KEY // don't use self apikey
};

const schema = z.object({
    email: z.string().email()
});

function verifySignature(body: string, timestamp: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', SHARED_SECRET);
    hmac.update(body + timestamp);
    const digest = hmac.digest('hex');
    console.log('Verifying signature...');
    console.log('Expected digest:', digest);
    console.log('Provided signature:', signature);
    return digest === signature;
}

export async function POST(request: NextRequest) {
    console.log('POST /xr/user-access-lookup called');

    // Get client IP
    const userIP = await getClientIp();
    console.log('Client IP:', userIP);

    try {
        await rateLimiter.consume(userIP, 1);
        console.log('Rate limiter check passed');
    } catch (err) {
        console.warn('Rate limit exceeded:', err);
        return Response.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check API key
    const auth = request.headers.get('authorization') || '';
    const apiKey = auth.split(' ')[1];
    console.log('Authorization header:', auth);

    if (!apiKey || !Object.values(VALID_API_KEYS).includes(apiKey)) {
        console.warn('Unauthorized access attempt. API key:', apiKey);
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('API key validated');

    // Signature verification
    const timestamp = request.headers.get('x-timestamp') || '';
    const signature = request.headers.get('x-signature') || '';
    const now = Date.now();
    const tsInt = parseInt(timestamp, 10);
    console.log('Timestamp:', timestamp);
    console.log('Signature:', signature);
    console.log('Time difference (ms):', Math.abs(now - tsInt));

    if (!timestamp || !signature || isNaN(tsInt) || Math.abs(now - tsInt) > 5 * 60 * 1000) {
        console.warn('Invalid timestamp or signature headers');
        return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const rawBody = await request.text();
    console.log('Raw request body:', rawBody);

    if (!verifySignature(rawBody, timestamp, signature)) {
        console.warn('Signature verification failed');
        return Response.json({ error: 'Invalid signature' }, { status: 403 });
    }

    let email: string;
    try {
        const parsed = schema.parse(JSON.parse(rawBody));
        email = parsed.email;
        console.log('Parsed email:', email);
    } catch (err) {
        console.error('Request validation failed:', err);
        return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!email) {
        console.warn('Email is empty or missing');
        return Response.json({ error: 'Invalid request, contact the administrator for help.' }, { status: 400 });
    }

    try {
        console.log('Querying database for user...');
        const user = await prisma.user.findFirst({
            where: { Email: email },
            select: {
                Email: true,
                Role: {
                    select: {
                        role: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
            },
        });

        if (!user) {
            console.log('User not found for email:', email);
            return Response.json({ error: 'Not found' }, { status: 404 });
        }

        console.log('User found:', user);

        const transformedUser = {
            ...user,
            Role: Array.isArray(user.Role)
                ? user.Role.map((r: { role: { name: string } }) => r.role.name)
                : []
        };

        console.log('Transformed user:', transformedUser);
        return Response.json(transformedUser);
    } catch (err) {
        console.error('Database error:', err);
        return Response.json({ error: 'Server error' }, { status: 500 });
    }
}
