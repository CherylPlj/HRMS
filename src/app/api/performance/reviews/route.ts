import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { performanceService } from '@/services/performanceService';
import { PerformanceReviewStatus } from '@prisma/client';
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

    const reviewerId = searchParams.get('reviewerId');
    if (reviewerId) filters.reviewerId = reviewerId;

    const status = searchParams.get('status');
    if (status && status !== 'all') {
      if (['draft', 'pending', 'completed', 'approved'].includes(status)) {
        filters.status = status as PerformanceReviewStatus;
      }
    } else if (status === 'all') {
      filters.status = 'all';
    }

    const startDateFrom = searchParams.get('startDateFrom');
    if (startDateFrom) {
      filters.startDateFrom = new Date(startDateFrom);
    }

    const startDateTo = searchParams.get('startDateTo');
    if (startDateTo) {
      filters.startDateTo = new Date(startDateTo);
    }

    const endDateFrom = searchParams.get('endDateFrom');
    if (endDateFrom) {
      filters.endDateFrom = new Date(endDateFrom);
    }

    const endDateTo = searchParams.get('endDateTo');
    if (endDateTo) {
      filters.endDateTo = new Date(endDateTo);
    }

    const period = searchParams.get('period');
    if (period) filters.period = period;

    const searchQuery = searchParams.get('search');
    if (searchQuery) filters.searchQuery = searchQuery;

    const result = await performanceService.getPerformanceReviews(filters);

    // Transform reviews to include overallScore (mapped from totalScore) for frontend compatibility
    const transformedReviews = result.reviews.map((review: any) => {
      const transformed = {
        ...review,
        overallScore: review.totalScore ? Number(review.totalScore) : null,
        status: review.status?.toLowerCase() || review.status,
        kpiScore: review.kpiScore ? Number(review.kpiScore) : null,
        behaviorScore: review.behaviorScore ? Number(review.behaviorScore) : null,
        attendanceScore: review.attendanceScore ? Number(review.attendanceScore) : null,
        totalScore: review.totalScore ? Number(review.totalScore) : null,
      };
      return transformed;
    });

    return NextResponse.json({
      ...result,
      reviews: transformedReviews,
    });
  } catch (error) {
    console.error('Error fetching performance reviews:', error);
    
    // Hide technical database errors from frontend
    const errorMessage = error instanceof Error ? error.message : '';
    const isDatabaseError = 
      errorMessage.includes('prepared statement') ||
      errorMessage.includes('ConnectorError') ||
      errorMessage.includes('QueryError') ||
      errorMessage.includes('PostgresError') ||
      errorMessage.includes('Prisma');
    
    const userFacingMessage = isDatabaseError
      ? 'Failed to fetch performance reviews. Please try again later.'
      : (errorMessage || 'Failed to fetch performance reviews');
    
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

    // Reviewer is optional - if not provided, use the current user as reviewer

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

    // Validate status enum if provided
    if (body.status && !['draft', 'pending', 'completed', 'approved'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be draft, pending, completed, or approved' },
        { status: 400 }
      );
    }

    // Validate scores are within reasonable range (0-100)
    if (body.kpiScore !== undefined && (body.kpiScore < 0 || body.kpiScore > 100)) {
      return NextResponse.json(
        { error: 'KPI score must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (body.behaviorScore !== undefined && (body.behaviorScore < 0 || body.behaviorScore > 100)) {
      return NextResponse.json(
        { error: 'Behavior score must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (body.attendanceScore !== undefined && (body.attendanceScore < 0 || body.attendanceScore > 100)) {
      return NextResponse.json(
        { error: 'Attendance score must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Get user ID from Clerk
    const userId = user.id;

    // Get the current user's UserID from the database (to use as reviewer)
    const currentUserRecord = await prisma.user.findUnique({
      where: { ClerkID: userId },
      select: { UserID: true },
    });

    // Convert reviewer EmployeeID to UserID if provided, otherwise use current user as reviewer
    let reviewerUserID: string | undefined = undefined;
    
    if (body.reviewerId) {
      // Find the User record that has this EmployeeID
      const reviewerUser = await prisma.user.findFirst({
        where: { EmployeeID: body.reviewerId },
        select: { UserID: true },
      });
      
      if (reviewerUser) {
        reviewerUserID = reviewerUser.UserID;
      } else {
        // Reviewer doesn't have a user account - use current user as fallback
        reviewerUserID = currentUserRecord?.UserID;
      }
    } else {
      // No reviewer specified - use current user as reviewer
      reviewerUserID = currentUserRecord?.UserID;
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

    // Create the review
    const review = await performanceService.createPerformanceReview({
      employeeId: body.employeeId,
      reviewerId: reviewerUserID || undefined,
      period: body.period,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      kpiScore: body.kpiScore,
      behaviorScore: body.behaviorScore,
      attendanceScore: body.attendanceScore,
      totalScore: body.totalScore,
      status: body.status ? (body.status as PerformanceReviewStatus) : undefined,
      remarks: body.remarks,
      employeeComments: body.employeeComments,
      goals: body.goals,
      achievements: body.achievements,
      improvementAreas: body.improvementAreas,
      createdBy: userId,
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating performance review:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create performance review';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

