import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List evaluations for a task or employee
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const employeeId = searchParams.get('employeeId');

    const where: any = {};
    if (taskId) where.taskId = Number(taskId);
    if (employeeId) where.performanceTask = { employeeId };

    const evaluations = await prisma.performanceEvaluation.findMany({
        where,
        include: { performanceTask: true, evaluator: true },
    });
    return NextResponse.json(evaluations);
}

// POST: Add evaluation (rating/comment)
export async function POST(req: NextRequest) {
    const data = await req.json();
    const evaluation = await prisma.performanceEvaluation.create({
        data,
    });
    return NextResponse.json(evaluation);
}
