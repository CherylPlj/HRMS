import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { performanceService } from '@/services/performanceService';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await params;

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { EmployeeID: employeeId },
      select: { EmployeeID: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const history = await performanceService.getEmployeePerformanceHistory(employeeId);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching employee performance history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch employee performance history';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

