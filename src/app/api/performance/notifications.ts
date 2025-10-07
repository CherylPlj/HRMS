import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List notifications for a user
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const isRead = searchParams.get('isRead');
    const where: any = {};
    if (userId) where.userId = userId;
    if (isRead !== null) where.isRead = isRead === 'true';
    const notifications = await prisma.performanceNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(notifications);
}

// POST: Create notification (e.g., report submission, deadline)
export async function POST(req: NextRequest) {
    const data = await req.json();
    const notification = await prisma.performanceNotification.create({
        data,
    });
    return NextResponse.json(notification);
}
