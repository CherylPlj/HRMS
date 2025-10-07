import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Generate performance report for employee or department
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const departmentId = searchParams.get('departmentId');
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    // Filter by employee or department
    let where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (departmentId) where.employee = { DepartmentID: Number(departmentId) };
    if (periodStart || periodEnd) {
        where.periodStart = {};
        if (periodStart) where.periodStart.gte = new Date(periodStart);
        if (periodEnd) where.periodEnd.lte = new Date(periodEnd);
    }

    const reports = await prisma.performanceReport.findMany({
        where,
        include: { employee: true },
        orderBy: { periodStart: 'desc' },
    });
    return NextResponse.json(reports);
}

// POST: Create new report
export async function POST(req: NextRequest) {
    const data = await req.json();
    const report = await prisma.performanceReport.create({
        data,
    });
    return NextResponse.json(report);
}
