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

    // Fetch promotion recommendations from the PromotionRecommendation table
    // Filter for pending/under review recommendations
    const where: any = {
      status: { in: ['Pending', 'UnderReview'] },
    };

    // Helper function to calculate years in service from hire date
    const calculateYearsInService = (hireDate: Date | null): number => {
      if (!hireDate) return 0;
      const now = new Date();
      const hire = new Date(hireDate);
      const years = (now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return Math.max(0, years);
    };

    // Fetch promotion recommendations with related data
    const [promotionRecommendations, total] = await Promise.all([
      prisma.promotionRecommendation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { eligibilityScore: 'desc' },
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
                      SalaryGrade: true,
                    },
                  },
                  HireDate: true,
                },
              },
            },
          },
        },
      }),
      prisma.promotionRecommendation.count({ where }),
    ]);

    // Transform the data to match the frontend interface
    const transformedRecommendations = promotionRecommendations.map((rec) => {
      const employee = rec.performanceModule.employee;
      const employmentDetail = employee.employmentDetails;
      const department = employee.Department?.DepartmentName || '';
      const employeeName = `${employee.FirstName} ${employee.MiddleName || ''} ${employee.LastName}`.trim();

      // Get current position and grade from module or employment detail
      const currentPosition = rec.performanceModule.currentPosition || employmentDetail?.Position || 'Not specified';
      const currentSalaryGrade = rec.performanceModule.currentSalaryGrade || employmentDetail?.SalaryGrade || 'Not specified';
      const proposedPosition = rec.recommendedPosition;
      const proposedSalaryGrade = rec.recommendedSalaryGrade || currentSalaryGrade;

      // Calculate years in position
      const yearsInPosition = rec.performanceModule.yearsInCurrentPosition || 0;

      // Calculate years in service from hire date
      const yearsInService = calculateYearsInService(employee.HireDate);

      // Get performance score from eligibility score
      const performanceScore = rec.eligibilityScore
        ? Number(rec.eligibilityScore)
        : rec.performanceModule.promotionEligibilityScore
        ? Number(rec.performanceModule.promotionEligibilityScore)
        : 0;

      // Get promotion reason
      const promotionReason = rec.promotionReason || 
        `Based on performance score (${performanceScore.toFixed(1)}) and ${yearsInService.toFixed(1)} years of service`;

      return {
        id: rec.id,
        employeeId: employee.EmployeeID,
        employeeName,
        department,
        currentPosition,
        currentSalaryGrade,
        proposedPosition,
        proposedSalaryGrade,
        promotionReason,
        performanceScore,
        yearsInPosition: Math.round(yearsInPosition * 10) / 10,
        yearsInService: Math.round(yearsInService * 10) / 10,
        status: rec.status,
        priority: rec.priority,
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
    console.error('Error fetching promotion recommendations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch promotion recommendations';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

