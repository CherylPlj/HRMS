import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { performanceService } from '@/services/performanceService';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse optional filters
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const summary = await performanceService.getDashboardSummary(
      employeeId || undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard summary';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

