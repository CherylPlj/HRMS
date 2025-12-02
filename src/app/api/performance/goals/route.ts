import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { performanceService } from '@/services/performanceService';
import { PerformanceGoalStatus } from '@prisma/client';
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

    const performanceReviewId = searchParams.get('performanceReviewId');
    if (performanceReviewId) filters.performanceReviewId = performanceReviewId;

    const status = searchParams.get('status');
    if (status && status !== 'all') {
      if (['NotStarted', 'InProgress', 'OnTrack', 'AtRisk', 'Completed', 'Cancelled'].includes(status)) {
        filters.status = status as PerformanceGoalStatus;
      }
    } else if (status === 'all') {
      filters.status = 'all';
    }

    const targetDateFrom = searchParams.get('targetDateFrom');
    if (targetDateFrom) {
      filters.targetDateFrom = new Date(targetDateFrom);
    }

    const targetDateTo = searchParams.get('targetDateTo');
    if (targetDateTo) {
      filters.targetDateTo = new Date(targetDateTo);
    }

    const searchQuery = searchParams.get('search');
    if (searchQuery) filters.searchQuery = searchQuery;

    const result = await performanceService.getPerformanceGoals(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching performance goals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch performance goals';
    return NextResponse.json(
      { error: errorMessage },
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

    if (!body.title) {
      return NextResponse.json(
        { error: 'Goal title is required' },
        { status: 400 }
      );
    }

    if (!body.targetDate) {
      return NextResponse.json(
        { error: 'Target date is required' },
        { status: 400 }
      );
    }

    // Validate status enum if provided
    if (body.status && !['NotStarted', 'InProgress', 'OnTrack', 'AtRisk', 'Completed', 'Cancelled'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be NotStarted, InProgress, OnTrack, AtRisk, Completed, or Cancelled' },
        { status: 400 }
      );
    }

    // Validate progress (0-100)
    if (body.progress !== undefined && (body.progress < 0 || body.progress > 100)) {
      return NextResponse.json(
        { error: 'Progress must be between 0 and 100' },
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

    // Verify performance review exists if provided
    if (body.performanceReviewId) {
      const review = await prisma.performanceReview.findUnique({
        where: { id: body.performanceReviewId },
        select: { id: true },
      });

      if (!review) {
        return NextResponse.json(
          { error: 'Performance review not found' },
          { status: 404 }
        );
      }
    }

    // Get user ID from Clerk
    const userId = user.id;

    // Create the goal
    const goal = await performanceService.createPerformanceGoal({
      employeeId: body.employeeId,
      performanceReviewId: body.performanceReviewId,
      title: body.title,
      description: body.description,
      targetDate: new Date(body.targetDate),
      status: body.status ? (body.status as PerformanceGoalStatus) : undefined,
      progress: body.progress,
      completionDate: body.completionDate ? new Date(body.completionDate) : undefined,
      notes: body.notes,
      createdBy: userId,
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('Error creating performance goal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create performance goal';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

