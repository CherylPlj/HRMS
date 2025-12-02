import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { performanceService } from '@/services/performanceService';
import { PerformanceMetricType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters: any = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
    };

    const employeeId = searchParams.get('employeeId');
    if (employeeId) filters.employeeId = employeeId;

    const metricType = searchParams.get('metricType');
    if (metricType && metricType !== 'all') {
      if (['KPI', 'Behavior', 'Attendance', 'Quality', 'Productivity', 'CustomerSatisfaction', 'Other'].includes(metricType)) {
        filters.metricType = metricType as PerformanceMetricType;
      }
    } else if (metricType === 'all') {
      filters.metricType = 'all';
    }

    const period = searchParams.get('period');
    if (period) filters.period = period;

    const periodStartFrom = searchParams.get('periodStartFrom');
    if (periodStartFrom) {
      filters.periodStartFrom = new Date(periodStartFrom);
    }

    const periodStartTo = searchParams.get('periodStartTo');
    if (periodStartTo) {
      filters.periodStartTo = new Date(periodStartTo);
    }

    const periodEndFrom = searchParams.get('periodEndFrom');
    if (periodEndFrom) {
      filters.periodEndFrom = new Date(periodEndFrom);
    }

    const periodEndTo = searchParams.get('periodEndTo');
    if (periodEndTo) {
      filters.periodEndTo = new Date(periodEndTo);
    }

    const searchQuery = searchParams.get('search');
    if (searchQuery) filters.searchQuery = searchQuery;

    const result = await performanceService.getPerformanceMetrics(filters);

    // Transform metrics to include total field for frontend compatibility
    return NextResponse.json({
      ...result,
      total: result.pagination?.total || result.metrics?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    
    // Hide technical database errors from frontend
    const errorMessage = error instanceof Error ? error.message : '';
    const isDatabaseError = 
      errorMessage.includes('prepared statement') ||
      errorMessage.includes('ConnectorError') ||
      errorMessage.includes('QueryError') ||
      errorMessage.includes('PostgresError') ||
      errorMessage.includes('Prisma');
    
    const userFacingMessage = isDatabaseError
      ? 'Failed to fetch performance metrics. Please try again later.'
      : (errorMessage || 'Failed to fetch performance metrics');
    
    return NextResponse.json(
      { error: userFacingMessage },
      { status: 500 }
    );
  }
}

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

    if (!body.metricName) {
      return NextResponse.json(
        { error: 'Metric name is required' },
        { status: 400 }
      );
    }

    if (!body.metricType) {
      return NextResponse.json(
        { error: 'Metric type is required' },
        { status: 400 }
      );
    }

    if (!['KPI', 'Behavior', 'Attendance', 'Quality', 'Productivity', 'CustomerSatisfaction', 'Other'].includes(body.metricType)) {
      return NextResponse.json(
        { error: 'Invalid metric type. Must be KPI, Behavior, Attendance, Quality, Productivity, CustomerSatisfaction, or Other' },
        { status: 400 }
      );
    }

    if (body.value === undefined || body.value === null) {
      return NextResponse.json(
        { error: 'Metric value is required' },
        { status: 400 }
      );
    }

    if (!body.period) {
      return NextResponse.json(
        { error: 'Period is required' },
        { status: 400 }
      );
    }

    if (!body.periodStart) {
      return NextResponse.json(
        { error: 'Period start date is required' },
        { status: 400 }
      );
    }

    if (!body.periodEnd) {
      return NextResponse.json(
        { error: 'Period end date is required' },
        { status: 400 }
      );
    }

    // Validate date range
    const periodStart = new Date(body.periodStart);
    const periodEnd = new Date(body.periodEnd);
    if (periodStart > periodEnd) {
      return NextResponse.json(
        { error: 'Period start date must be before or equal to period end date' },
        { status: 400 }
      );
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { EmployeeID: body.employeeId },
      select: { EmployeeID: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Get user ID from Clerk
    const userId = user.id;

    // Create the metric
    const metric = await performanceService.createPerformanceMetric({
      employeeId: body.employeeId,
      metricName: body.metricName,
      metricType: body.metricType as PerformanceMetricType,
      value: body.value,
      target: body.target,
      unit: body.unit,
      period: body.period,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      notes: body.notes,
      createdBy: userId,
    });

    return NextResponse.json(metric, { status: 201 });
  } catch (error) {
    console.error('Error creating performance metric:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create performance metric';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

