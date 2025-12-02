import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { performanceService } from '@/services/performanceService';
import { PerformanceReviewStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

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
    const review = await performanceService.getPerformanceReviewById(id);

    if (!review) {
      return NextResponse.json(
        { error: 'Performance review not found' },
        { status: 404 }
      );
    }

    // Transform review to include overallScore (mapped from totalScore) for frontend compatibility
    // Note: Don't include reviewer information for employee/faculty views
    const transformedReview = {
      ...review,
      overallScore: review.totalScore ? Number(review.totalScore) : null,
      status: review.status?.toLowerCase() || review.status,
      kpiScore: review.kpiScore ? Number(review.kpiScore) : null,
      behaviorScore: review.behaviorScore ? Number(review.behaviorScore) : null,
      attendanceScore: review.attendanceScore ? Number(review.attendanceScore) : null,
      totalScore: review.totalScore ? Number(review.totalScore) : null,
      // Include employee name
      employeeName: review.employee
        ? `${review.employee.FirstName || ''} ${review.employee.LastName || ''}`.trim()
        : null,
      // Explicitly exclude reviewer information
      reviewer: undefined,
      reviewerId: undefined,
      reviewerName: undefined,
    };

    return NextResponse.json(transformedReview);
  } catch (error) {
    console.error('Error fetching performance review:', error);
    
    // Hide technical database errors from frontend
    const errorMessage = error instanceof Error ? error.message : '';
    const isDatabaseError = 
      errorMessage.includes('prepared statement') ||
      errorMessage.includes('ConnectorError') ||
      errorMessage.includes('QueryError') ||
      errorMessage.includes('PostgresError') ||
      errorMessage.includes('Prisma');
    
    const userFacingMessage = isDatabaseError
      ? 'Failed to fetch performance review. Please try again later.'
      : (errorMessage || 'Failed to fetch performance review');
    
    return NextResponse.json(
      { error: userFacingMessage },
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

    // Validate date range if both dates are provided
    if (body.startDate && body.endDate) {
      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);
      if (startDate > endDate) {
        return NextResponse.json(
          { error: 'Start date must be before or equal to end date' },
          { status: 400 }
        );
      }
    }

    // Convert reviewer EmployeeID to UserID if needed (similar to disciplinary module)
    // Reviewer is optional - not all employees have user accounts yet
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
        // Reviewer doesn't have a user account - allow null reviewer
        // This allows updating reviews even when reviewer doesn't have an account
        reviewerUserID = undefined;
      }
    }

    // Get user ID from Clerk
    const userId = user.id;

    // Update the review
    const review = await performanceService.updatePerformanceReview(id, {
      reviewerId: reviewerUserID || undefined,
      period: body.period,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
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
      reviewedAt: body.reviewedAt ? new Date(body.reviewedAt) : undefined,
      approvedAt: body.approvedAt ? new Date(body.approvedAt) : undefined,
      updatedBy: userId,
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error updating performance review:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update performance review';
    
    // Handle not found error
    if (errorMessage.includes('not found') || errorMessage.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Performance review not found' },
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

    // Check if review exists
    const review = await performanceService.getPerformanceReviewById(id);
    if (!review) {
      return NextResponse.json(
        { error: 'Performance review not found' },
        { status: 404 }
      );
    }

    await performanceService.deletePerformanceReview(id);

    return NextResponse.json({ message: 'Performance review deleted successfully' });
  } catch (error) {
    console.error('Error deleting performance review:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete performance review';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

