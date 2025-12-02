import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { performanceService } from '@/services/performanceService';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    if (!body.startDate) {
      return NextResponse.json(
        { error: 'Start date is required' },
        { status: 400 }
      );
    }

    if (!body.endDate) {
      return NextResponse.json(
        { error: 'End date is required' },
        { status: 400 }
      );
    }

    // Validate date range
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Start date must be before or equal to end date' },
        { status: 400 }
      );
    }

    // Calculate scores from metrics
    const result = await performanceService.calculateCategoryScores(
      body.employeeId,
      startDate,
      endDate
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error calculating scores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to calculate scores';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

