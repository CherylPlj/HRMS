import { prisma } from '@/lib/prisma';
import { PerformanceReviewStatus, KPICategory, PerformanceGoalStatus, PerformanceMetricType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreatePerformanceReviewInput {
  employeeId: string;
  reviewerId?: string; // Made optional - not all employees have user accounts
  period?: string;
  startDate: Date;
  endDate: Date;
  kpiScore?: number;
  behaviorScore?: number;
  attendanceScore?: number;
  totalScore?: number;
  status?: PerformanceReviewStatus;
  remarks?: string;
  employeeComments?: string;
  goals?: any;
  achievements?: any;
  improvementAreas?: any;
  createdBy?: string;
}

export interface UpdatePerformanceReviewInput {
  reviewerId?: string;
  period?: string;
  startDate?: Date;
  endDate?: Date;
  kpiScore?: number;
  behaviorScore?: number;
  attendanceScore?: number;
  totalScore?: number;
  status?: PerformanceReviewStatus;
  remarks?: string;
  employeeComments?: string;
  goals?: any;
  achievements?: any;
  improvementAreas?: any;
  reviewedAt?: Date;
  approvedAt?: Date;
  updatedBy?: string;
}

export interface PerformanceReviewFilters {
  employeeId?: string;
  reviewerId?: string;
  status?: PerformanceReviewStatus | 'all';
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  period?: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface CreateKPIInput {
  name: string;
  description: string;
  category: KPICategory;
  weight: number;
  maxScore: number;
  minScore?: number;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateKPIInput {
  name?: string;
  description?: string;
  category?: KPICategory;
  weight?: number;
  maxScore?: number;
  minScore?: number;
  isActive?: boolean;
  updatedBy?: string;
}

export interface KPIFilters {
  category?: KPICategory | 'all';
  isActive?: boolean;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface CreatePerformanceGoalInput {
  employeeId: string;
  performanceReviewId?: string;
  title: string;
  description?: string;
  targetDate: Date;
  status?: PerformanceGoalStatus;
  progress?: number;
  completionDate?: Date;
  notes?: string;
  createdBy?: string;
}

export interface UpdatePerformanceGoalInput {
  performanceReviewId?: string;
  title?: string;
  description?: string;
  targetDate?: Date;
  status?: PerformanceGoalStatus;
  progress?: number;
  completionDate?: Date;
  notes?: string;
  updatedBy?: string;
}

export interface PerformanceGoalFilters {
  employeeId?: string;
  performanceReviewId?: string;
  status?: PerformanceGoalStatus | 'all';
  targetDateFrom?: Date;
  targetDateTo?: Date;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface CreatePerformanceMetricInput {
  employeeId: string;
  metricName: string;
  metricType: PerformanceMetricType;
  value: number;
  target?: number;
  unit?: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  notes?: string;
  createdBy?: string;
}

export interface UpdatePerformanceMetricInput {
  metricName?: string;
  metricType?: PerformanceMetricType;
  value?: number;
  target?: number;
  unit?: string;
  period?: string;
  periodStart?: Date;
  periodEnd?: Date;
  notes?: string;
  updatedBy?: string;
}

export interface PerformanceMetricFilters {
  employeeId?: string;
  metricType?: PerformanceMetricType | 'all';
  period?: string;
  periodStartFrom?: Date;
  periodStartTo?: Date;
  periodEndFrom?: Date;
  periodEndTo?: Date;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export class PerformanceService {
  /**
   * Calculate total score from individual scores
   */
  private calculateTotalScore(kpiScore?: number, behaviorScore?: number, attendanceScore?: number): number | null {
    const scores = [kpiScore, behaviorScore, attendanceScore].filter((s) => s !== null && s !== undefined) as number[];
    if (scores.length === 0) return null;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Calculate category scores from KPIs and PerformanceMetrics
   * Returns scores for KPI, Behavior, and Attendance categories
   */
  async calculateCategoryScores(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    kpiScore: number | null;
    behaviorScore: number | null;
    attendanceScore: number | null;
    metrics: any[];
    breakdown: {
      category: string;
      metrics: any[];
      calculatedScore: number | null;
    }[];
  }> {
    // Get active KPIs grouped by category
    const activeKPIs = await prisma.kPI.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });

    // Get PerformanceMetrics for the employee within the date range
    const metrics = await prisma.performanceMetric.findMany({
      where: {
        employeeId,
        OR: [
          // Metrics that start within the review period
          {
            periodStart: { gte: startDate, lte: endDate },
          },
          // Metrics that end within the review period
          {
            periodEnd: { gte: startDate, lte: endDate },
          },
          // Metrics that span the entire review period
          {
            periodStart: { lte: startDate },
            periodEnd: { gte: endDate },
          },
        ],
      },
      orderBy: { periodStart: 'asc' },
    });

    // Group KPIs by category
    const kpisByCategory = {
      kpi: activeKPIs.filter((k) => k.category === KPICategory.kpi),
      behavior: activeKPIs.filter((k) => k.category === KPICategory.behavior),
      attendance: activeKPIs.filter((k) => k.category === KPICategory.attendance),
    };

    // Map metric types to categories
    const metricTypeToCategory: Record<string, string> = {
      KPI: 'kpi',
      Behavior: 'behavior',
      Attendance: 'attendance',
    };

    // Calculate scores for each category
    const calculateCategoryScore = (category: 'kpi' | 'behavior' | 'attendance'): number | null => {
      const categoryKPIs = kpisByCategory[category];
      if (categoryKPIs.length === 0) return null;

      // Get metrics for this category
      const categoryMetrics = metrics.filter((m) => {
        const metricCategory = metricTypeToCategory[m.metricType] || 'other';
        return metricCategory === category;
      });

      if (categoryMetrics.length === 0) return null;

      // Calculate weighted average
      let totalWeightedScore = 0;
      let totalWeight = 0;

      for (const metric of categoryMetrics) {
        const metricValue = Number(metric.value);
        const metricTarget = metric.target ? Number(metric.target) : 100;

        // Find matching KPI by name (fuzzy match or exact)
        const matchingKPI = categoryKPIs.find(
          (kpi) => kpi.name.toLowerCase().includes(metric.metricName.toLowerCase()) ||
                   metric.metricName.toLowerCase().includes(kpi.name.toLowerCase())
        );

        if (matchingKPI) {
          // Calculate score as percentage of target, scaled to KPI maxScore
          const percentageOfTarget = metricTarget > 0 ? (metricValue / metricTarget) * 100 : 0;
          const scaledScore = Math.min(
            matchingKPI.maxScore.toNumber(),
            Math.max(
              matchingKPI.minScore.toNumber(),
              (percentageOfTarget / 100) * matchingKPI.maxScore.toNumber()
            )
          );

          const weight = matchingKPI.weight.toNumber();
          totalWeightedScore += scaledScore * weight;
          totalWeight += weight;
        } else {
          // If no matching KPI, use default calculation
          const percentageOfTarget = metricTarget > 0 ? (metricValue / metricTarget) * 100 : 0;
          const defaultMaxScore = 100;
          const scaledScore = Math.min(defaultMaxScore, Math.max(0, percentageOfTarget));
          
          // Use average weight if no specific KPI found
          const avgWeight = categoryKPIs.reduce((sum, k) => sum + k.weight.toNumber(), 0) / categoryKPIs.length;
          totalWeightedScore += scaledScore * avgWeight;
          totalWeight += avgWeight;
        }
      }

      if (totalWeight === 0) return null;
      return totalWeightedScore / totalWeight;
    };

    const kpiScore = calculateCategoryScore('kpi');
    const behaviorScore = calculateCategoryScore('behavior');
    const attendanceScore = calculateCategoryScore('attendance');

    // Create breakdown
    const breakdown = [
      {
        category: 'KPI',
        metrics: metrics.filter((m) => metricTypeToCategory[m.metricType] === 'kpi'),
        calculatedScore: kpiScore,
      },
      {
        category: 'Behavior',
        metrics: metrics.filter((m) => metricTypeToCategory[m.metricType] === 'behavior'),
        calculatedScore: behaviorScore,
      },
      {
        category: 'Attendance',
        metrics: metrics.filter((m) => metricTypeToCategory[m.metricType] === 'attendance'),
        calculatedScore: attendanceScore,
      },
    ];

    return {
      kpiScore,
      behaviorScore,
      attendanceScore,
      metrics,
      breakdown,
    };
  }

  /**
   * Create a new performance review
   */
  async createPerformanceReview(input: CreatePerformanceReviewInput) {
    const totalScore = input.totalScore ?? this.calculateTotalScore(
      input.kpiScore,
      input.behaviorScore,
      input.attendanceScore
    );

    // Build data object, only including reviewerId if it's provided
    const reviewData: any = {
      employeeId: input.employeeId,
      period: input.period,
      startDate: input.startDate,
      endDate: input.endDate,
      kpiScore: input.kpiScore ? new Decimal(input.kpiScore) : null,
      behaviorScore: input.behaviorScore ? new Decimal(input.behaviorScore) : null,
      attendanceScore: input.attendanceScore ? new Decimal(input.attendanceScore) : null,
      totalScore: totalScore ? new Decimal(totalScore) : null,
      status: input.status || PerformanceReviewStatus.draft,
      remarks: input.remarks,
      employeeComments: input.employeeComments,
      goals: input.goals,
      achievements: input.achievements,
      improvementAreas: input.improvementAreas,
      createdBy: input.createdBy,
    };

    // Only include reviewerId if it's provided (not undefined or empty)
    if (input.reviewerId) {
      reviewData.reviewerId = input.reviewerId;
    }

    const review = await prisma.performanceReview.create({
      data: reviewData,
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
            Department: true,
            Position: true,
          },
        },
        reviewer: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        performanceGoals: true,
      },
    });

    return review;
  }

  /**
   * Get performance reviews with filtering, pagination, and search
   */
  async getPerformanceReviews(filters: PerformanceReviewFilters = {}) {
    const {
      employeeId,
      reviewerId,
      status,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      period,
      searchQuery,
      page = 1,
      limit = 10,
    } = filters;

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (reviewerId) {
      where.reviewerId = reviewerId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) {
        where.startDate.gte = startDateFrom;
      }
      if (startDateTo) {
        where.startDate.lte = startDateTo;
      }
    }

    if (endDateFrom || endDateTo) {
      where.endDate = {};
      if (endDateFrom) {
        where.endDate.gte = endDateFrom;
      }
      if (endDateTo) {
        where.endDate.lte = endDateTo;
      }
    }

    if (period) {
      where.period = period;
    }

    if (searchQuery) {
      where.OR = [
        { period: { contains: searchQuery, mode: 'insensitive' } },
        { remarks: { contains: searchQuery, mode: 'insensitive' } },
        {
          employee: {
            OR: [
              { FirstName: { contains: searchQuery, mode: 'insensitive' } },
              { LastName: { contains: searchQuery, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.performanceReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              EmployeeID: true,
              FirstName: true,
              LastName: true,
              MiddleName: true,
              Department: true,
              Position: true,
            },
          },
          reviewer: {
            select: {
              UserID: true,
              FirstName: true,
              LastName: true,
            },
          },
          performanceGoals: true,
        },
      }),
      prisma.performanceReview.count({ where }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single performance review by ID
   */
  async getPerformanceReviewById(id: string) {
    const review = await prisma.performanceReview.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
            Department: true,
            Position: true,
          },
        },
        reviewer: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        performanceGoals: true,
      },
    });

    return review;
  }

  /**
   * Update a performance review
   */
  async updatePerformanceReview(id: string, input: UpdatePerformanceReviewInput) {
    const updateData: any = {};

    // Handle reviewerId - can be null to clear it, or a string value
    if (input.reviewerId !== undefined) {
      updateData.reviewerId = input.reviewerId || null;
    }
    if (input.period !== undefined) updateData.period = input.period;
    if (input.startDate !== undefined) updateData.startDate = input.startDate;
    if (input.endDate !== undefined) updateData.endDate = input.endDate;
    if (input.kpiScore !== undefined) updateData.kpiScore = input.kpiScore ? new Decimal(input.kpiScore) : null;
    if (input.behaviorScore !== undefined) updateData.behaviorScore = input.behaviorScore ? new Decimal(input.behaviorScore) : null;
    if (input.attendanceScore !== undefined) updateData.attendanceScore = input.attendanceScore ? new Decimal(input.attendanceScore) : null;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.remarks !== undefined) updateData.remarks = input.remarks;
    if (input.employeeComments !== undefined) updateData.employeeComments = input.employeeComments;
    if (input.goals !== undefined) updateData.goals = input.goals;
    if (input.achievements !== undefined) updateData.achievements = input.achievements;
    if (input.improvementAreas !== undefined) updateData.improvementAreas = input.improvementAreas;
    if (input.reviewedAt !== undefined) updateData.reviewedAt = input.reviewedAt;
    if (input.approvedAt !== undefined) updateData.approvedAt = input.approvedAt;
    if (input.updatedBy !== undefined) updateData.updatedBy = input.updatedBy;

    // Recalculate total score if any score changed
    if (input.kpiScore !== undefined || input.behaviorScore !== undefined || input.attendanceScore !== undefined) {
      const currentReview = await prisma.performanceReview.findUnique({
        where: { id },
        select: { kpiScore: true, behaviorScore: true, attendanceScore: true },
      });

      const kpiScore = input.kpiScore ?? (currentReview?.kpiScore ? Number(currentReview.kpiScore) : undefined);
      const behaviorScore = input.behaviorScore ?? (currentReview?.behaviorScore ? Number(currentReview.behaviorScore) : undefined);
      const attendanceScore = input.attendanceScore ?? (currentReview?.attendanceScore ? Number(currentReview.attendanceScore) : undefined);

      const totalScore = input.totalScore ?? this.calculateTotalScore(kpiScore, behaviorScore, attendanceScore);
      updateData.totalScore = totalScore ? new Decimal(totalScore) : null;
    } else if (input.totalScore !== undefined) {
      updateData.totalScore = input.totalScore ? new Decimal(input.totalScore) : null;
    }

    const review = await prisma.performanceReview.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
            Department: true,
            Position: true,
          },
        },
        reviewer: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        performanceGoals: true,
      },
    });

    return review;
  }

  /**
   * Delete a performance review
   */
  async deletePerformanceReview(id: string) {
    await prisma.performanceReview.delete({
      where: { id },
    });
  }

  /**
   * Create a new KPI
   */
  async createKPI(input: CreateKPIInput) {
    const kpi = await prisma.kPI.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        weight: new Decimal(input.weight),
        maxScore: new Decimal(input.maxScore),
        minScore: new Decimal(input.minScore || 0),
        isActive: input.isActive ?? true,
        createdBy: input.createdBy,
      },
    });

    return kpi;
  }

  /**
   * Get KPIs with filtering, pagination, and search
   */
  async getKPIs(filters: KPIFilters = {}) {
    const {
      category,
      isActive,
      searchQuery,
      page = 1,
      limit = 10,
    } = filters;

    const where: any = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [kpis, total] = await Promise.all([
      prisma.kPI.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.kPI.count({ where }),
    ]);

    return {
      kpis,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single KPI by ID
   */
  async getKPIById(id: string) {
    const kpi = await prisma.kPI.findUnique({
      where: { id },
    });

    return kpi;
  }

  /**
   * Update a KPI
   */
  async updateKPI(id: string, input: UpdateKPIInput) {
    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.weight !== undefined) updateData.weight = new Decimal(input.weight);
    if (input.maxScore !== undefined) updateData.maxScore = new Decimal(input.maxScore);
    if (input.minScore !== undefined) updateData.minScore = new Decimal(input.minScore);
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.updatedBy !== undefined) updateData.updatedBy = input.updatedBy;

    const kpi = await prisma.kPI.update({
      where: { id },
      data: updateData,
    });

    return kpi;
  }

  /**
   * Delete a KPI
   */
  async deleteKPI(id: string) {
    await prisma.kPI.delete({
      where: { id },
    });
  }

  /**
   * Create a new performance goal
   */
  async createPerformanceGoal(input: CreatePerformanceGoalInput) {
    const goal = await prisma.performanceGoal.create({
      data: {
        employeeId: input.employeeId,
        performanceReviewId: input.performanceReviewId,
        title: input.title,
        description: input.description,
        targetDate: input.targetDate,
        status: input.status || PerformanceGoalStatus.NotStarted,
        progress: input.progress || 0,
        completionDate: input.completionDate,
        notes: input.notes,
        createdBy: input.createdBy,
      },
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
          },
        },
        review: {
          select: {
            id: true,
            period: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    return goal;
  }

  /**
   * Get performance goals with filtering, pagination, and search
   */
  async getPerformanceGoals(filters: PerformanceGoalFilters = {}) {
    const {
      employeeId,
      performanceReviewId,
      status,
      targetDateFrom,
      targetDateTo,
      searchQuery,
      page = 1,
      limit = 10,
    } = filters;

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (performanceReviewId) {
      where.performanceReviewId = performanceReviewId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (targetDateFrom || targetDateTo) {
      where.targetDate = {};
      if (targetDateFrom) {
        where.targetDate.gte = targetDateFrom;
      }
      if (targetDateTo) {
        where.targetDate.lte = targetDateTo;
      }
    }

    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { notes: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [goals, total] = await Promise.all([
      prisma.performanceGoal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              EmployeeID: true,
              FirstName: true,
              LastName: true,
              MiddleName: true,
            },
          },
          review: {
            select: {
              id: true,
              period: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      }),
      prisma.performanceGoal.count({ where }),
    ]);

    return {
      goals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single performance goal by ID
   */
  async getPerformanceGoalById(id: string) {
    const goal = await prisma.performanceGoal.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
          },
        },
        review: {
          select: {
            id: true,
            period: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    return goal;
  }

  /**
   * Update a performance goal
   */
  async updatePerformanceGoal(id: string, input: UpdatePerformanceGoalInput) {
    const updateData: any = {};

    if (input.performanceReviewId !== undefined) updateData.performanceReviewId = input.performanceReviewId;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.targetDate !== undefined) updateData.targetDate = input.targetDate;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.progress !== undefined) updateData.progress = input.progress;
    if (input.completionDate !== undefined) updateData.completionDate = input.completionDate;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.updatedBy !== undefined) updateData.updatedBy = input.updatedBy;

    const goal = await prisma.performanceGoal.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
          },
        },
        review: {
          select: {
            id: true,
            period: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    return goal;
  }

  /**
   * Delete a performance goal
   */
  async deletePerformanceGoal(id: string) {
    await prisma.performanceGoal.delete({
      where: { id },
    });
  }

  /**
   * Create a new performance metric
   */
  async createPerformanceMetric(input: CreatePerformanceMetricInput) {
    const metric = await prisma.performanceMetric.create({
      data: {
        employeeId: input.employeeId,
        metricName: input.metricName,
        metricType: input.metricType,
        value: new Decimal(input.value),
        target: input.target ? new Decimal(input.target) : null,
        unit: input.unit,
        period: input.period,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        notes: input.notes,
        createdBy: input.createdBy,
      },
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
          },
        },
      },
    });

    return metric;
  }

  /**
   * Get performance metrics with filtering, pagination, and search
   */
  async getPerformanceMetrics(filters: PerformanceMetricFilters = {}) {
    const {
      employeeId,
      metricType,
      period,
      periodStartFrom,
      periodStartTo,
      periodEndFrom,
      periodEndTo,
      searchQuery,
      page = 1,
      limit = 10,
    } = filters;

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (metricType && metricType !== 'all') {
      where.metricType = metricType;
    }

    if (period) {
      where.period = period;
    }

    if (periodStartFrom || periodStartTo) {
      where.periodStart = {};
      if (periodStartFrom) {
        where.periodStart.gte = periodStartFrom;
      }
      if (periodStartTo) {
        where.periodStart.lte = periodStartTo;
      }
    }

    if (periodEndFrom || periodEndTo) {
      where.periodEnd = {};
      if (periodEndFrom) {
        where.periodEnd.gte = periodEndFrom;
      }
      if (periodEndTo) {
        where.periodEnd.lte = periodEndTo;
      }
    }

    if (searchQuery) {
      where.OR = [
        { metricName: { contains: searchQuery, mode: 'insensitive' } },
        { period: { contains: searchQuery, mode: 'insensitive' } },
        { notes: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [metrics, total] = await Promise.all([
      prisma.performanceMetric.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              EmployeeID: true,
              FirstName: true,
              LastName: true,
              MiddleName: true,
            },
          },
        },
      }),
      prisma.performanceMetric.count({ where }),
    ]);

    return {
      metrics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single performance metric by ID
   */
  async getPerformanceMetricById(id: string) {
    const metric = await prisma.performanceMetric.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
          },
        },
      },
    });

    return metric;
  }

  /**
   * Update a performance metric
   */
  async updatePerformanceMetric(id: string, input: UpdatePerformanceMetricInput) {
    const updateData: any = {};

    if (input.metricName !== undefined) updateData.metricName = input.metricName;
    if (input.metricType !== undefined) updateData.metricType = input.metricType;
    if (input.value !== undefined) updateData.value = new Decimal(input.value);
    if (input.target !== undefined) updateData.target = input.target ? new Decimal(input.target) : null;
    if (input.unit !== undefined) updateData.unit = input.unit;
    if (input.period !== undefined) updateData.period = input.period;
    if (input.periodStart !== undefined) updateData.periodStart = input.periodStart;
    if (input.periodEnd !== undefined) updateData.periodEnd = input.periodEnd;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.updatedBy !== undefined) updateData.updatedBy = input.updatedBy;

    const metric = await prisma.performanceMetric.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
          },
        },
      },
    });

    return metric;
  }

  /**
   * Delete a performance metric
   */
  async deletePerformanceMetric(id: string) {
    await prisma.performanceMetric.delete({
      where: { id },
    });
  }

  /**
   * Get dashboard summary statistics
   */
  async getDashboardSummary(employeeId?: string, startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) {
        where.startDate.gte = startDate;
      }
      if (endDate) {
        where.startDate.lte = endDate;
      }
    }

    let reviews;
    try {
      reviews = await prisma.performanceReview.findMany({
        where,
        include: {
          employee: {
            select: {
              EmployeeID: true,
              FirstName: true,
              LastName: true,
              MiddleName: true,
              Department: true,
              Position: true,
            },
          },
        },
      });
    } catch (error) {
      // If connection error, try to reconnect
      if (error instanceof Error && error.message.includes('prepared statement')) {
        await prisma.$disconnect();
        await prisma.$connect();
        reviews = await prisma.performanceReview.findMany({
          where,
          include: {
            employee: {
              select: {
                EmployeeID: true,
                FirstName: true,
                LastName: true,
                MiddleName: true,
                Department: true,
                Position: true,
              },
            },
          },
        });
      } else {
        throw error;
      }
    }

    const totalReviews = reviews.length;
    const completedReviews = reviews.filter((r) => r.status === PerformanceReviewStatus.completed || r.status === PerformanceReviewStatus.approved).length;

    const scores = reviews
      .map((r) => (r.totalScore ? Number(r.totalScore) : null))
      .filter((s) => s !== null) as number[];

    const averageKpiScore = reviews
      .map((r) => (r.kpiScore ? Number(r.kpiScore) : null))
      .filter((s) => s !== null);
    const avgKpi = averageKpiScore.length > 0
      ? averageKpiScore.reduce((sum, score) => sum + score, 0) / averageKpiScore.length
      : 0;

    const averageTotalScore = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;

    // Top performers (top 10 by total score)
    const topPerformers = reviews
      .filter((r) => r.totalScore)
      .sort((a, b) => {
        const scoreA = a.totalScore ? Number(a.totalScore) : 0;
        const scoreB = b.totalScore ? Number(b.totalScore) : 0;
        return scoreB - scoreA;
      })
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: `${r.employee.FirstName} ${r.employee.LastName}`,
        department: r.employee.Department?.DepartmentName || '',
        position: r.employee.Position || '',
        totalScore: r.totalScore ? Number(r.totalScore) : 0,
        kpiScore: r.kpiScore ? Number(r.kpiScore) : 0,
        behaviorScore: r.behaviorScore ? Number(r.behaviorScore) : 0,
        attendanceScore: r.attendanceScore ? Number(r.attendanceScore) : 0,
        period: r.period,
      }));

    // Employees needing improvement (bottom 10 by total score)
    const employeesNeedingImprovement = reviews
      .filter((r) => r.totalScore)
      .sort((a, b) => {
        const scoreA = a.totalScore ? Number(a.totalScore) : 0;
        const scoreB = b.totalScore ? Number(b.totalScore) : 0;
        return scoreA - scoreB;
      })
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: `${r.employee.FirstName} ${r.employee.LastName}`,
        department: r.employee.Department?.DepartmentName || '',
        position: r.employee.Position || '',
        totalScore: r.totalScore ? Number(r.totalScore) : 0,
        kpiScore: r.kpiScore ? Number(r.kpiScore) : 0,
        behaviorScore: r.behaviorScore ? Number(r.behaviorScore) : 0,
        attendanceScore: r.attendanceScore ? Number(r.attendanceScore) : 0,
        improvementAreas: r.improvementAreas ? (Array.isArray(r.improvementAreas) ? r.improvementAreas : []) : [],
      }));

    // Count employees up for promotion (high scores)
    const employeesUpForPromotion = reviews.filter(
      (r) => r.totalScore && Number(r.totalScore) >= 85
    ).length;

    // Count employees needing training (low scores)
    const employeesNeedingTraining = reviews.filter(
      (r) => r.totalScore && Number(r.totalScore) < 70
    ).length;

    return {
      averageKpiScore: avgKpi,
      averageTotalScore,
      totalReviews,
      completedReviews,
      employeesUpForPromotion,
      employeesNeedingTraining,
      topPerformers,
      employeesNeedingImprovement,
    };
  }

  /**
   * Get employee-specific performance history
   */
  async getEmployeePerformanceHistory(employeeId: string) {
    const reviews = await prisma.performanceReview.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
      include: {
        reviewer: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        performanceGoals: true,
      },
    });

    const goals = await prisma.performanceGoal.findMany({
      where: { employeeId },
      orderBy: { targetDate: 'desc' },
      include: {
        review: {
          select: {
            id: true,
            period: true,
          },
        },
      },
    });

    const metrics = await prisma.performanceMetric.findMany({
      where: { employeeId },
      orderBy: { periodStart: 'desc' },
    });

    return {
      reviews,
      goals,
      metrics,
    };
  }
}

export const performanceService = new PerformanceService();

