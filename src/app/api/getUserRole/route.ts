// app/api/getUserRole/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimiter } from '@/lib/limiter';
import { getServerIp } from '@/lib/ip';

const VALID_API_KEYS = {
    'sis': process.env.SJSFI_SIS_API_KEY,
    'lms': process.env.SJSFI_LMS_API_KEY,
    'hrms': process.env.SJSFI_HRMS_API_KEY
}

export async function GET(request: NextRequest) {
    console.log('GET /api/getUserRole called');
    // Get client IP from headers (server-side)
    const userIP = getServerIp(request);

    try {
        // Check rate limit
        await rateLimiter.consume(userIP, 1);
    } catch {
        return NextResponse.json(
            { error: 'Too many requests, please try again later.' },
            { status: 429 }
        );
    }

    // Check for API key in the Authorization header and if it matches a valid trusted key
    const authorization = request.headers.get('authorization');
    const apiKey = authorization?.split(' ')[1];
    if (!apiKey || !Object.values(VALID_API_KEYS).includes(apiKey)) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId && !email) {
        return NextResponse.json(
            { error: 'Invalid request, contact the administrator for help.' },
            { status: 400 }
        );
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(userId ? [{ UserID: String(userId) }] : []),
                    ...(email ? [{ Email: String(email) }] : []),
                ],
            },
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

        // Transform the response to flatten role names
        if (user) {
            const transformedUser = {
                ...user,
                Role: user.Role.map((r: { role: { name: string } }) => r.role.name)
            };
            return NextResponse.json(transformedUser);
        }

        return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
        );
    } catch (error) {
        console.error('Error in getUserRole:', error);
        return NextResponse.json(
            { 
                error: 'Internal Server Error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    } finally {
        // Ensure connection cleanup in development
        if (process.env.NODE_ENV === 'development') {
            await prisma.$disconnect();
        }
    }
}