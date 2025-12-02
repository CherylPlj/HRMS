import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { performanceService } from '@/services/performanceService';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/performance/my-performance
 * 
 * Returns performance data for the current employee/faculty user
 * This endpoint automatically determines the employeeId from the authenticated user
 */
// Helper function to retry database operations with reconnection
async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || '';
      
      // Check if it's a prepared statement error (connection issue)
      const errorString = String(error || '');
      const errorCode = (error as any)?.code || '';
      const isConnectionError = 
        errorMessage.includes('prepared statement') ||
        errorMessage.includes('does not exist') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('ConnectorError') ||
        errorMessage.includes('QueryError') ||
        errorMessage.includes('PostgresError') ||
        errorMessage.includes('connection pool') ||
        errorMessage.includes('connection pool timeout') ||
        errorMessage.includes('Timed out fetching') ||
        errorString.includes('connection pool') ||
        errorString.includes('connection pool timeout') ||
        errorString.includes('Timed out fetching') ||
        errorString.includes('prepared statement') ||
        errorString.includes('42P05') || // PostgreSQL: duplicate prepared statement
        errorCode === '42P05' ||
        errorMessage.includes('P1001') ||
        errorMessage.includes('P1017');
      
      if (isConnectionError) {
        if (attempt < maxRetries - 1) {
          // Try to reconnect - disconnect and reconnect to clear connection state
          try {
            // Force disconnect to clear prepared statements
            await prisma.$disconnect().catch(() => {});
            // Wait before reconnecting to ensure connection is fully closed
            await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
            // Reconnect to get a fresh connection
            await prisma.$connect();
            // Wait a bit before retrying the operation
            await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
          } catch (reconnectError) {
            console.error('Reconnection attempt failed:', reconnectError);
            // Even if reconnect fails, wait before retry
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          }
          continue; // Retry the operation
        }
      }
      // If it's not a connection error or we've exhausted retries, throw
      throw error;
    }
  }
  
  throw lastError || new Error('Database operation failed after retries');
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user's UserID from the database with retry logic
    const currentUserRecord = await retryDatabaseOperation(async () => {
      return await prisma.user.findUnique({
        where: { ClerkID: user.id },
        select: { UserID: true, EmployeeID: true },
      });
    });

    if (!currentUserRecord) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Get employeeId - check if user has EmployeeID directly, or if they're a Faculty
    let employeeId: string | null = currentUserRecord.EmployeeID;

    // If no direct EmployeeID, check if user is a Faculty member
    if (!employeeId) {
      const faculty = await retryDatabaseOperation(async () => {
        return await prisma.faculty.findFirst({
          where: { UserID: currentUserRecord.UserID },
          select: { EmployeeID: true },
        });
      });
      employeeId = faculty?.EmployeeID || null;
    }

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID not found for this user' },
        { status: 404 }
      );
    }

    // Fetch performance reviews with retry logic
    const reviewsResult = await retryDatabaseOperation(async () => {
      return await performanceService.getPerformanceReviews({
        employeeId,
        limit: 100, // Get all reviews for the employee
      });
    });

    // Fetch performance metrics with retry logic and error handling
    let metricsResult;
    try {
      metricsResult = await retryDatabaseOperation(async () => {
        return await performanceService.getPerformanceMetrics({
          employeeId,
          limit: 100, // Get all metrics for the employee
        });
      });
    } catch (metricsError) {
      // Log the error but don't fail the entire request
      console.error('Error fetching performance metrics:', metricsError);
      metricsResult = {
        metrics: [],
        pagination: {
          page: 1,
          limit: 100,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Transform reviews to include overallScore and proper formatting
    // Note: Don't include reviewer information for employee/faculty views
    const transformedReviews = reviewsResult.reviews.map((review: any) => {
      return {
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
    });

    // Calculate summary statistics
    const completedReviews = transformedReviews.filter(
      (r: any) => r.status === 'completed' || r.status === 'approved'
    );
    const pendingReviews = transformedReviews.filter(
      (r: any) => r.status === 'pending' || r.status === 'draft'
    );

    const completedWithScores = completedReviews.filter(
      (r: any) => r.overallScore !== null && r.overallScore !== undefined
    );
    const averageScore =
      completedWithScores.length > 0
        ? completedWithScores.reduce(
            (sum: number, r: any) => sum + (r.overallScore || 0),
            0
          ) / completedWithScores.length
        : 0;

    const averageKpiScore =
      completedWithScores.length > 0
        ? completedWithScores.reduce(
            (sum: number, r: any) => sum + (r.kpiScore || 0),
            0
          ) / completedWithScores.length
        : 0;

    return NextResponse.json({
      employeeId,
      reviews: transformedReviews,
      metrics: metricsResult.metrics || [],
      summary: {
        totalReviews: transformedReviews.length,
        completedReviews: completedReviews.length,
        pendingReviews: pendingReviews.length,
        averageScore: Math.round(averageScore * 100) / 100,
        averageKpiScore: Math.round(averageKpiScore * 100) / 100,
        totalMetrics: metricsResult.pagination?.total || metricsResult.metrics?.length || 0,
      },
      pagination: {
        reviews: reviewsResult.pagination,
        metrics: metricsResult.pagination,
      },
    });
  } catch (error) {
    console.error('Error fetching my performance data:', error);
    
    // Hide technical database errors from frontend
    const errorMessage = error instanceof Error ? error.message : '';
    const errorString = String(error || '');
    
    // Check for various database/Prisma errors
    const errorCode = (error as any)?.code || '';
    const isDatabaseError = 
      errorMessage.includes('prepared statement') ||
      errorMessage.includes('already exists') ||
      errorMessage.includes('ConnectorError') ||
      errorMessage.includes('QueryError') ||
      errorMessage.includes('PostgresError') ||
      errorMessage.includes('Prisma') ||
      errorMessage.includes('connection pool') ||
      errorMessage.includes('connection pool timeout') ||
      errorMessage.includes('Timed out fetching') ||
      errorString.includes('connection pool') ||
      errorString.includes('connection pool timeout') ||
      errorString.includes('Timed out fetching') ||
      errorString.includes('prepared statement') ||
      errorString.includes('already exists') ||
      errorString.includes('42P05') || // PostgreSQL: duplicate prepared statement
      errorCode === '42P05' ||
      errorMessage.includes('P1001') || // Prisma connection error code
      errorMessage.includes('P1017') || // Prisma server closed connection
      errorMessage.includes('P2002') || // Prisma unique constraint
      errorMessage.includes('P2025');   // Prisma record not found
    
    const userFacingMessage = isDatabaseError
      ? 'Failed to load performance data. Please try again later.'
      : 'Failed to load performance data. Please try again later.';
    
    return NextResponse.json({ error: userFacingMessage }, { status: 500 });
  }
}

