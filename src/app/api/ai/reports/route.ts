import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import type { ReportType, ReportFilters } from '@/types/aiAgent';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as ReportType;
    const departmentId = searchParams.get('departmentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');

    if (!type) {
      return NextResponse.json(
        { error: 'Report type is required' },
        { status: 400 }
      );
    }

    const filters: ReportFilters = {
      departmentId: departmentId ? parseInt(departmentId) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      employeeId: employeeId || undefined,
    };

    let reportData: any = {};

    switch (type) {
      case 'training-needs': {
        const where: any = {};
        if (filters.departmentId) {
          where.employee = { DepartmentID: filters.departmentId };
        }
        if (filters.employeeId) {
          where.employeeId = filters.employeeId;
        }

        const analyses = await prisma.trainingNeedsAnalysis.findMany({
          where,
          include: {
            employee: {
              select: {
                EmployeeID: true,
                FirstName: true,
                LastName: true,
                Department: {
                  select: {
                    DepartmentName: true,
                  },
                },
              },
            },
          },
          orderBy: { priorityScore: 'desc' },
        });

        reportData = {
          type: 'training-needs',
          total: analyses.length,
          analyses: analyses.map(a => ({
            employeeId: a.employeeId,
            employeeName: `${a.employee.FirstName} ${a.employee.LastName}`,
            department: a.employee.Department?.DepartmentName,
            priorityScore: a.priorityScore,
            skillGaps: a.skillGaps,
            trainingPlan: a.trainingPlan,
            status: a.status,
            analysisDate: a.analysisDate,
          })),
        };
        break;
      }

      case 'promotion-readiness': {
        const where: any = {};
        if (filters.departmentId) {
          where.employee = { DepartmentID: filters.departmentId };
        }
        if (filters.employeeId) {
          where.employeeId = filters.employeeId;
        }

        const modules = await prisma.performanceModule.findMany({
          where,
          include: {
            employee: {
              select: {
                EmployeeID: true,
                FirstName: true,
                LastName: true,
                Department: {
                  select: {
                    DepartmentName: true,
                  },
                },
              },
            },
          },
          orderBy: { promotionEligibilityScore: 'desc' },
        });

        reportData = {
          type: 'promotion-readiness',
          total: modules.length,
          ready: modules.filter(m => Number(m.promotionEligibilityScore || 0) >= 85).length,
          consider: modules.filter(m => {
            const score = Number(m.promotionEligibilityScore || 0);
            return score >= 70 && score < 85;
          }).length,
          modules: modules.map(m => ({
            employeeId: m.employeeId,
            employeeName: `${m.employee.FirstName} ${m.employee.LastName}`,
            department: m.employee.Department?.DepartmentName,
            currentPosition: m.currentPosition,
            recommendedPosition: m.recommendedPosition,
            eligibilityScore: m.promotionEligibilityScore,
            recommendation: m.promotionRecommendation,
            status: m.status,
          })),
        };
        break;
      }

      case 'disciplinary-risk': {
        const where: any = {};
        if (filters.departmentId) {
          where.employee = { DepartmentID: filters.departmentId };
        }
        if (filters.employeeId) {
          where.employeeId = filters.employeeId;
        }

        const risks = await prisma.disciplinaryRiskAnalysis.findMany({
          where,
          include: {
            employee: {
              select: {
                EmployeeID: true,
                FirstName: true,
                LastName: true,
                Department: {
                  select: {
                    DepartmentName: true,
                  },
                },
              },
            },
          },
          orderBy: { riskScore: 'desc' },
        });

        reportData = {
          type: 'disciplinary-risk',
          total: risks.length,
          highRisk: risks.filter(r => r.riskLevel === 'High' || r.riskLevel === 'Critical').length,
          risks: risks.map(r => ({
            employeeId: r.employeeId,
            employeeName: `${r.employee.FirstName} ${r.employee.LastName}`,
            department: r.employee.Department?.DepartmentName,
            riskScore: r.riskScore,
            riskLevel: r.riskLevel,
            riskFactors: r.riskFactors,
            recommendedAction: r.recommendedAction,
            lastAnalysisDate: r.lastAnalysisDate,
          })),
        };
        break;
      }

      case 'recruitment-quality': {
        const where: any = {};
        if (filters.startDate && filters.endDate) {
          where.screenedAt = {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate),
          };
        }

        const screenings = await prisma.candidateScreening.findMany({
          where,
          include: {
            candidate: {
              select: {
                CandidateID: true,
                FullName: true,
                Status: true,
              },
            },
            vacancy: {
              select: {
                VacancyID: true,
                VacancyName: true,
                JobTitle: true,
              },
            },
          },
          orderBy: { screenedAt: 'desc' },
        });

        const total = screenings.length;
        const strongRecommend = screenings.filter(s => s.recommendation === 'StrongRecommend').length;
        const recommend = screenings.filter(s => s.recommendation === 'Recommend').length;
        const consider = screenings.filter(s => s.recommendation === 'Consider').length;
        const reject = screenings.filter(s => s.recommendation === 'Reject').length;

        reportData = {
          type: 'recruitment-quality',
          total,
          recommendations: {
            strongRecommend,
            recommend,
            consider,
            reject,
          },
          averageScore: total > 0
            ? screenings.reduce((sum, s) => sum + (Number(s.overallScore) || 0), 0) / total
            : 0,
          screenings: screenings.map(s => ({
            candidateId: s.candidateId,
            candidateName: s.candidate.FullName,
            vacancyName: s.vacancy.VacancyName,
            jobTitle: s.vacancy.JobTitle,
            overallScore: s.overallScore,
            recommendation: s.recommendation,
            screenedAt: s.screenedAt,
          })),
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

