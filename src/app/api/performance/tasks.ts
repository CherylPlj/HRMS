import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List/filter/search tasks
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
        where.dueDate = {};
        if (dateFrom) where.dueDate.gte = new Date(dateFrom);
        if (dateTo) where.dueDate.lte = new Date(dateTo);
    }

    const tasks = await prisma.performanceTask.findMany({
        where,
        orderBy: { dueDate: 'desc' },
        include: { evaluations: true },
    });
    return NextResponse.json(tasks);
}

// POST: Create new task
export async function POST(req: NextRequest) {
    const data = await req.json();
    const task = await prisma.performanceTask.create({
        data,
    });
    return NextResponse.json(task);
}
