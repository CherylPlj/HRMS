import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { performanceService } from '@/services/performanceService';
import { PerformanceMetricType } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const metric = await performanceService.getPerformanceMetricById(id);

    if (!metric) {
      return NextResponse.json(
        { error: 'Performance metric not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(metric);
  } catch (error) {
    console.error('Error fetching performance metric:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch performance metric';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate metric type enum if provided
    if (body.metricType && !['KPI', 'Behavior', 'Attendance', 'Quality', 'Productivity', 'CustomerSatisfaction', 'Other'].includes(body.metricType)) {
      return NextResponse.json(
        { error: 'Invalid metric type. Must be KPI, Behavior, Attendance, Quality, Productivity, CustomerSatisfaction, or Other' },
        { status: 400 }
      );
    }

    // Validate date range if both dates are provided
    if (body.periodStart && body.periodEnd) {
      const periodStart = new Date(body.periodStart);
      const periodEnd = new Date(body.periodEnd);
      if (periodStart > periodEnd) {
        return NextResponse.json(
          { error: 'Period start date must be before or equal to period end date' },
          { status: 400 }
        );
      }
    }

    // Get user ID from Clerk
    const userId = user.id;

    // Update the metric
    const metric = await performanceService.updatePerformanceMetric(id, {
      metricName: body.metricName,
      metricType: body.metricType ? (body.metricType as PerformanceMetricType) : undefined,
      value: body.value,
      target: body.target,
      unit: body.unit,
      period: body.period,
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
      notes: body.notes,
      updatedBy: userId,
    });

    return NextResponse.json(metric);
  } catch (error) {
    console.error('Error updating performance metric:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update performance metric';
    
    // Handle not found error
    if (errorMessage.includes('not found') || errorMessage.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Performance metric not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if metric exists
    const metric = await performanceService.getPerformanceMetricById(id);
    if (!metric) {
      return NextResponse.json(
        { error: 'Performance metric not found' },
        { status: 404 }
      );
    }

    await performanceService.deletePerformanceMetric(id);

    return NextResponse.json({ message: 'Performance metric deleted successfully' });
  } catch (error) {
    console.error('Error deleting performance metric:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete performance metric';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

