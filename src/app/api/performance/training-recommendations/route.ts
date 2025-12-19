import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma, ensurePrismaConnected } from '@/lib/prisma';
import { TrainingPriority } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Ensure Prisma is connected before making queries
    await ensurePrismaConnected();
    
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Get filter parameters
    const departmentFilter = searchParams.get('department');
    const positionFilter = searchParams.get('position');
    const priorityFilter = searchParams.get('priority');

    // Build where clause for filtering
    const where: any = {};
    
    // Priority filter
    if (priorityFilter) {
      const priorityMap: Record<string, TrainingPriority> = {
        high: TrainingPriority.High,
        medium: TrainingPriority.Medium,
        low: TrainingPriority.Low,
        critical: TrainingPriority.Critical,
      };
      if (priorityMap[priorityFilter.toLowerCase()]) {
        where.priority = priorityMap[priorityFilter.toLowerCase()];
      }
    }

    // Get all recommendations for filter options and filtering (without pagination)
    const allRecommendations = await prisma.trainingRecommendation.findMany({
      where,
      include: {
        performanceModule: {
          include: {
            employee: {
              select: {
                Position: true,
                Department: {
                  select: {
                    DepartmentName: true,
                  },
                },
                employmentDetails: {
                  select: {
                    Position: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Apply department and position filters to all recommendations
    const filteredRecommendations = allRecommendations.filter((rec) => {
      const employee = (rec as any).performanceModule.employee;
      const position = employee.employmentDetails?.Position || employee.Position || '';
      const department = employee.Department?.DepartmentName || '';
      
      if (departmentFilter && department.toLowerCase() !== departmentFilter.toLowerCase()) {
        return false;
      }
      if (positionFilter && position.toLowerCase() !== positionFilter.toLowerCase()) {
        return false;
      }
      return true;
    });

    // Apply pagination to filtered results
    const paginatedFiltered = filteredRecommendations.slice(skip, skip + limit);

    // Transform paginated results
    const transformedPaginated = paginatedFiltered.map((rec) => {
      const employee = (rec as any).performanceModule.employee;
      const position = employee.employmentDetails?.Position || employee.Position || '';
      const department = employee.Department?.DepartmentName || '';
      const employeeName = `${employee.FirstName} ${employee.MiddleName || ''} ${employee.LastName}`.trim();

      const priorityMap: Record<string, 'high' | 'medium' | 'low'> = {
        Critical: 'high',
        High: 'high',
        Medium: 'medium',
        Low: 'low',
      };

      const estimatedDuration = rec.estimatedHours
        ? `${rec.estimatedHours} hours`
        : 'Not specified';

      return {
        id: rec.id,
        employeeId: employee.EmployeeID,
        employeeName,
        department,
        position,
        recommendedTraining: rec.trainingTitle,
        priority: priorityMap[rec.priority] || 'medium',
        reason: rec.reason || rec.trainingDescription || 'No reason provided',
        estimatedDuration,
      };
    });

    // Get unique departments and positions for filter dropdowns
    const uniqueDepartments = Array.from(
      new Set(
        allRecommendations
          .map((r) => (r as any).performanceModule.employee.Department?.DepartmentName)
          .filter(Boolean)
      )
    ).sort();

    const uniquePositions = Array.from(
      new Set(
        allRecommendations
          .map((r) => {
            const emp = (r as any).performanceModule.employee;
            return emp.employmentDetails?.Position || emp.Position;
          })
          .filter(Boolean)
      )
    ).sort();

    return NextResponse.json({
      recommendations: transformedPaginated,
      pagination: {
        page,
        limit,
        total: filteredRecommendations.length,
        totalPages: Math.ceil(filteredRecommendations.length / limit),
      },
      filters: {
        departments: uniqueDepartments,
        positions: uniquePositions,
      },
    });
  } catch (error) {
    console.error('Error fetching training recommendations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch training recommendations';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

