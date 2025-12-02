import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Fetch training recommendations with employee and performance module data
    const [trainingRecommendations, total] = await Promise.all([
      prisma.trainingRecommendation.findMany({
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          performanceModule: {
            include: {
              employee: {
                select: {
                  EmployeeID: true,
                  FirstName: true,
                  LastName: true,
                  MiddleName: true,
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
      }),
      prisma.trainingRecommendation.count(),
    ]);

    // Transform the data to match the frontend interface
    const transformedRecommendations = trainingRecommendations.map((rec) => {
      const employee = (rec as any).performanceModule.employee;
      const position = employee.employmentDetails?.[0]?.Position || '';
      const department = employee.Department?.DepartmentName || '';
      const employeeName = `${employee.FirstName} ${employee.MiddleName || ''} ${employee.LastName}`.trim();

      // Convert priority enum to lowercase for frontend
      const priorityMap: Record<string, 'high' | 'medium' | 'low'> = {
        Critical: 'high',
        High: 'high',
        Medium: 'medium',
        Low: 'low',
      };

      // Format estimated hours to duration string
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

    return NextResponse.json({
      recommendations: transformedRecommendations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

