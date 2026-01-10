import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userIds } = await request.json();

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: 'Invalid userIds array' }, { status: 400 });
        }

        // Limit to reasonable number to prevent abuse
        const limitedUserIds = userIds.slice(0, 100);

        // Fetch all users in one query
        const users = await prisma.user.findMany({
            where: {
                UserID: {
                    in: limitedUserIds
                }
            },
            select: {
                UserID: true,
                Photo: true
            }
        });

        // Create a map of userId -> photoUrl
        const photoMap: Record<string, string> = {};
        users.forEach(user => {
            photoMap[user.UserID] = user.Photo || '/manprofileavatar.png';
        });

        // Fill in missing users with default avatar
        limitedUserIds.forEach(id => {
            if (!photoMap[id]) {
                photoMap[id] = '/manprofileavatar.png';
            }
        });

        return NextResponse.json({ photos: photoMap });
    } catch (error) {
        console.error('Error fetching bulk photos:', error);
        return NextResponse.json(
            { error: 'Failed to fetch photos', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
