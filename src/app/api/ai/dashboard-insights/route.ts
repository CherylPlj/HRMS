import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma, ensurePrismaConnected } from '@/lib/prisma';
import type { DashboardInsights } from '@/types/aiAgent';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure Prisma connection is established
    await ensurePrismaConnected();

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const monthStart = new Date(now.setMonth(now.getMonth() - 1));

    // Candidates screened
    const candidatesScreenedToday = await prisma.candidateScreening.count({
      where: {
        screenedAt: { gte: todayStart },
        status: 'Completed',
      },
    });

    const candidatesScreenedWeek = await prisma.candidateScreening.count({
      where: {
        screenedAt: { gte: weekStart },
        status: 'Completed',
      },
    });

    const candidatesScreenedMonth = await prisma.candidateScreening.count({
      where: {
        screenedAt: { gte: monthStart },
        status: 'Completed',
      },
    });

    // Promotion ready employees
    const promotionReadyModules = await prisma.performanceModule.findMany({
      where: {
        promotionEligibilityScore: { gte: 85 },
        status: 'Active',
      },
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
          },
        },
      },
      orderBy: { promotionEligibilityScore: 'desc' },
      take: 10,
    });

    // Training needs
    const trainingNeeds = await prisma.trainingNeedsAnalysis.findMany({
      where: {
        status: { in: ['Pending', 'InProgress'] },
      },
      include: {
        employee: {
          select: {
            Department: {
              select: {
                DepartmentName: true,
              },
            },
          },
        },
      },
    });

    const highPriorityTraining = trainingNeeds.filter(
      t => Number(t.priorityScore || 0) >= 70
    ).length;

    const trainingByDepartment: Record<string, number> = {};
    trainingNeeds.forEach(t => {
      const dept = t.employee.Department?.DepartmentName || 'Unknown';
      trainingByDepartment[dept] = (trainingByDepartment[dept] || 0) + 1;
    });

    // High risk employees
    const highRiskEmployees = await prisma.disciplinaryRiskAnalysis.findMany({
      where: {
        riskLevel: { in: ['High', 'Critical'] },
      },
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
          },
        },
      },
      orderBy: { riskScore: 'desc' },
      take: 10,
    });

    // Recent recommendations (last 7 days)
    const recentScreenings = await prisma.candidateScreening.findMany({
      where: {
        screenedAt: { gte: weekStart },
        recommendation: { in: ['StrongRecommend', 'Recommend'] },
      },
      include: {
        candidate: {
          select: {
            CandidateID: true,
            FullName: true,
          },
        },
      },
      orderBy: { screenedAt: 'desc' },
      take: 5,
    });

    const insights: DashboardInsights = {
      candidatesScreened: {
        today: candidatesScreenedToday,
        thisWeek: candidatesScreenedWeek,
        thisMonth: candidatesScreenedMonth,
      },
      promotionReady: {
        count: promotionReadyModules.length,
        employees: promotionReadyModules.map(m => ({
          employeeId: m.employeeId,
          name: `${m.employee.FirstName} ${m.employee.LastName}`,
          score: Number(m.promotionEligibilityScore) || 0,
        })),
      },
      trainingNeeds: {
        total: trainingNeeds.length,
        highPriority: highPriorityTraining,
        byDepartment: trainingByDepartment,
      },
      highRiskEmployees: {
        count: highRiskEmployees.length,
        employees: highRiskEmployees.map(r => ({
          employeeId: r.employeeId,
          name: `${r.employee.FirstName} ${r.employee.LastName}`,
          riskLevel: r.riskLevel,
          riskScore: Number(r.riskScore) || 0,
        })),
      },
      recentRecommendations: recentScreenings.map(s => ({
        type: 'candidate-screening',
        candidateId: s.candidateId,
        message: `Strong candidate: ${s.candidate.FullName} (Score: ${s.overallScore})`,
        timestamp: s.screenedAt || new Date(),
      })),
    };

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error fetching dashboard insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard insights';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

