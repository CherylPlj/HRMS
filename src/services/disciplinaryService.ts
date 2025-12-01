import { prisma } from '@/lib/prisma';
import { DisciplinarySeverity, DisciplinaryStatus } from '@prisma/client';

export interface CreateDisciplinaryRecordInput {
  employeeId: string;
  supervisorId?: string;
  category: string;
  violation: string;
  severity: DisciplinarySeverity;
  status?: DisciplinaryStatus;
  dateTime?: Date;
  resolution?: string;
  resolutionDate?: Date;
  remarks?: string;
  interviewNotes?: string;
  hrRemarks?: string;
  recommendedPenalty?: string;
  offenseCount?: number;
  createdBy?: string;
}

export interface UpdateDisciplinaryRecordInput {
  supervisorId?: string;
  category?: string;
  violation?: string;
  severity?: DisciplinarySeverity;
  status?: DisciplinaryStatus;
  dateTime?: Date;
  resolution?: string;
  resolutionDate?: Date;
  remarks?: string;
  interviewNotes?: string;
  hrRemarks?: string;
  recommendedPenalty?: string;
  offenseCount?: number;
  updatedBy?: string;
}

export interface DisciplinaryRecordFilters {
  category?: string;
  severity?: DisciplinarySeverity | 'all';
  status?: DisciplinaryStatus | 'all';
  employeeId?: string;
  supervisorId?: string;
  violation?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export class DisciplinaryService {
  /**
   * Generate a unique case number
   * Format: DISC-YYYY-NNNN (e.g., DISC-2024-0001)
   */
  async generateCaseNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `DISC-${currentYear}-`;

    // Find the highest case number for this year
    const lastRecord = await prisma.disciplinaryRecord.findFirst({
      where: {
        caseNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        caseNo: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastRecord) {
      const match = lastRecord.caseNo.match(new RegExp(`${prefix}(\\d{4})$`));
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Create a new disciplinary record
   */
  async createDisciplinaryRecord(input: CreateDisciplinaryRecordInput) {
    const caseNo = await this.generateCaseNumber();

    const record = await prisma.disciplinaryRecord.create({
      data: {
        caseNo,
        employeeId: input.employeeId,
        supervisorId: input.supervisorId,
        category: input.category,
        violation: input.violation,
        severity: input.severity,
        status: input.status || DisciplinaryStatus.Ongoing,
        dateTime: input.dateTime || new Date(),
        resolution: input.resolution,
        resolutionDate: input.resolutionDate,
        remarks: input.remarks,
        interviewNotes: input.interviewNotes,
        hrRemarks: input.hrRemarks,
        recommendedPenalty: input.recommendedPenalty,
        offenseCount: input.offenseCount || 1,
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
        supervisor: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        evidence: true,
        actions: true,
      },
    });

    return record;
  }

  /**
   * Get disciplinary records with filtering, pagination, and search
   */
  async getDisciplinaryRecords(filters: DisciplinaryRecordFilters = {}) {
    const {
      category,
      severity,
      status,
      employeeId,
      supervisorId,
      violation,
      dateFrom,
      dateTo,
      searchQuery,
      page = 1,
      limit = 10,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (severity && severity !== 'all') {
      where.severity = severity;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (supervisorId) {
      where.supervisorId = supervisorId;
    }

    if (violation) {
      where.violation = {
        contains: violation,
        mode: 'insensitive',
      };
    }

    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) {
        where.dateTime.gte = dateFrom;
      }
      if (dateTo) {
        where.dateTime.lte = dateTo;
      }
    }

    // Search query across multiple fields
    if (searchQuery) {
      where.OR = [
        { caseNo: { contains: searchQuery, mode: 'insensitive' } },
        { violation: { contains: searchQuery, mode: 'insensitive' } },
        { category: { contains: searchQuery, mode: 'insensitive' } },
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

    // Get total count - handle connection errors
    let totalCount: number;
    try {
      totalCount = await prisma.disciplinaryRecord.count({ where });
    } catch (error) {
      // If connection error, try to reconnect
      if (error instanceof Error && error.message.includes('prepared statement')) {
        await prisma.$disconnect();
        await prisma.$connect();
        totalCount = await prisma.disciplinaryRecord.count({ where });
      } else {
        throw error;
      }
    }

    // Get records - handle connection errors
    let records;
    try {
      records = await prisma.disciplinaryRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              EmployeeID: true,
              FirstName: true,
              LastName: true,
              MiddleName: true,
            },
          },
          supervisor: {
            select: {
              UserID: true,
              FirstName: true,
              LastName: true,
            },
          },
          evidence: {
            select: {
              id: true,
              fileName: true,
              fileType: true,
              fileUrl: true,
              uploadedAt: true,
            },
          },
          actions: {
            select: {
              id: true,
              actionType: true,
              status: true,
              effectiveDate: true,
              endDate: true,
            },
          },
        },
        orderBy: {
          dateTime: 'desc',
        },
      });
    } catch (error) {
      // If connection error, try to reconnect
      if (error instanceof Error && error.message.includes('prepared statement')) {
        await prisma.$disconnect();
        await prisma.$connect();
        records = await prisma.disciplinaryRecord.findMany({
          where,
          skip,
          take: limit,
          include: {
            employee: {
              select: {
                EmployeeID: true,
                FirstName: true,
                LastName: true,
                MiddleName: true,
              },
            },
            supervisor: {
              select: {
                UserID: true,
                FirstName: true,
                LastName: true,
              },
            },
            evidence: {
              select: {
                id: true,
                fileName: true,
                fileType: true,
                fileUrl: true,
                uploadedAt: true,
              },
            },
            actions: {
              select: {
                id: true,
                actionType: true,
                status: true,
                effectiveDate: true,
                endDate: true,
              },
            },
          },
          orderBy: {
            dateTime: 'desc',
          },
        });
      } else {
        throw error;
      }
    }

    return {
      records,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get a single disciplinary record by ID
   */
  async getDisciplinaryRecordById(id: string) {
    const record = await prisma.disciplinaryRecord.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
            ExtensionName: true,
          },
        },
        supervisor: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        evidence: {
          orderBy: {
            uploadedAt: 'desc',
          },
        },
        actions: {
          include: {
            appeals: {
              include: {
                employee: {
                  select: {
                    EmployeeID: true,
                    FirstName: true,
                    LastName: true,
                  },
                },
                reviewer: {
                  select: {
                    UserID: true,
                    FirstName: true,
                    LastName: true,
                  },
                },
              },
              orderBy: {
                appealDate: 'desc',
              },
            },
            approver: {
              select: {
                UserID: true,
                FirstName: true,
                LastName: true,
              },
            },
          },
          orderBy: {
            effectiveDate: 'desc',
          },
        },
      },
    });

    return record;
  }

  /**
   * Get disciplinary record by case number
   */
  async getDisciplinaryRecordByCaseNo(caseNo: string) {
    const record = await prisma.disciplinaryRecord.findUnique({
      where: { caseNo },
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
            ExtensionName: true,
          },
        },
        supervisor: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        evidence: {
          orderBy: {
            uploadedAt: 'desc',
          },
        },
        actions: {
          include: {
            appeals: true,
            approver: {
              select: {
                UserID: true,
                FirstName: true,
                LastName: true,
              },
            },
          },
          orderBy: {
            effectiveDate: 'desc',
          },
        },
      },
    });

    return record;
  }

  /**
   * Update a disciplinary record
   */
  async updateDisciplinaryRecord(id: string, input: UpdateDisciplinaryRecordInput) {
    const updateData: any = {};

    if (input.supervisorId !== undefined) updateData.supervisorId = input.supervisorId;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.violation !== undefined) updateData.violation = input.violation;
    if (input.severity !== undefined) updateData.severity = input.severity;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.dateTime !== undefined) updateData.dateTime = input.dateTime;
    if (input.resolution !== undefined) updateData.resolution = input.resolution;
    if (input.resolutionDate !== undefined) updateData.resolutionDate = input.resolutionDate;
    if (input.remarks !== undefined) updateData.remarks = input.remarks;
    if (input.interviewNotes !== undefined) updateData.interviewNotes = input.interviewNotes;
    if (input.hrRemarks !== undefined) updateData.hrRemarks = input.hrRemarks;
    if (input.recommendedPenalty !== undefined) updateData.recommendedPenalty = input.recommendedPenalty;
    if (input.offenseCount !== undefined) updateData.offenseCount = input.offenseCount;
    if (input.updatedBy !== undefined) updateData.updatedBy = input.updatedBy;

    let record;
    try {
      record = await prisma.disciplinaryRecord.update({
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
          supervisor: {
            select: {
              UserID: true,
              FirstName: true,
              LastName: true,
            },
          },
          evidence: true,
          actions: true,
        },
      });
    } catch (error: unknown) {
      // If connection error, try to reconnect
      if (error instanceof Error && error.message.includes('prepared statement')) {
        await prisma.$disconnect();
        await prisma.$connect();
        record = await prisma.disciplinaryRecord.update({
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
            supervisor: {
              select: {
                UserID: true,
                FirstName: true,
                LastName: true,
              },
            },
            evidence: true,
            actions: true,
          },
        });
      } else {
        throw error;
      }
    }

    return record;
  }

  /**
   * Delete a disciplinary record
   */
  async deleteDisciplinaryRecord(id: string) {
    // This will cascade delete evidence and actions due to onDelete: Cascade
    await prisma.disciplinaryRecord.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Get employee's disciplinary history
   */
  async getEmployeeDisciplinaryHistory(employeeId: string) {
    let records;
    try {
      records = await prisma.disciplinaryRecord.findMany({
        where: { employeeId },
        include: {
          supervisor: {
            select: {
              UserID: true,
              FirstName: true,
              LastName: true,
            },
          },
          evidence: {
            select: {
              id: true,
              fileName: true,
              fileType: true,
              fileUrl: true,
              uploadedAt: true,
            },
          },
          actions: {
            select: {
              id: true,
              actionType: true,
              status: true,
              effectiveDate: true,
              endDate: true,
            },
          },
        },
        orderBy: {
          dateTime: 'desc',
        },
      });
    } catch (error) {
      // If connection error, try to reconnect
      if (error instanceof Error && error.message.includes('prepared statement')) {
        await prisma.$disconnect();
        await prisma.$connect();
        records = await prisma.disciplinaryRecord.findMany({
          where: { employeeId },
          include: {
            supervisor: {
              select: {
                UserID: true,
                FirstName: true,
                LastName: true,
              },
            },
            evidence: {
              select: {
                id: true,
                fileName: true,
                fileType: true,
                fileUrl: true,
                uploadedAt: true,
              },
            },
            actions: {
              select: {
                id: true,
                actionType: true,
                status: true,
                effectiveDate: true,
                endDate: true,
              },
            },
          },
          orderBy: {
            dateTime: 'desc',
          },
        });
      } else {
        throw error;
      }
    }

    // Calculate statistics
    const totalCases = records.length;
    const ongoingCount = records.filter((r) => r.status === DisciplinaryStatus.Ongoing).length;
    const forReviewCount = records.filter((r) => r.status === DisciplinaryStatus.For_Review).length;
    const resolvedCount = records.filter((r) => r.status === DisciplinaryStatus.Resolved).length;
    const closedCount = records.filter((r) => r.status === DisciplinaryStatus.Closed).length;

    // Get employee info
    const employee = await prisma.employee.findUnique({
      where: { EmployeeID: employeeId },
      select: {
        EmployeeID: true,
        FirstName: true,
        LastName: true,
        MiddleName: true,
      },
    });

    // Transform records to match frontend format
    const transformedOffenses = records.map((record) => ({
      id: record.id,
      caseNo: record.caseNo,
      employeeId: record.employeeId,
      employee: employee
        ? `${employee.FirstName} ${employee.MiddleName || ''} ${employee.LastName}`.trim()
        : 'Unknown',
      supervisorId: record.supervisorId,
      supervisor: record.supervisor
        ? `${record.supervisor.FirstName} ${record.supervisor.LastName}`
        : '',
      category: record.category,
      violation: record.violation,
      severity: record.severity,
      status: record.status === DisciplinaryStatus.For_Review ? 'For Review' : record.status,
      dateTime: record.dateTime.toISOString(),
      resolution: record.resolution,
      resolutionDate: record.resolutionDate?.toISOString(),
      remarks: record.remarks,
      interviewNotes: record.interviewNotes,
      hrRemarks: record.hrRemarks,
      recommendedPenalty: record.recommendedPenalty,
      digitalAcknowledgment: record.digitalAcknowledgment,
      acknowledgedAt: record.acknowledgedAt?.toISOString(),
      offenseCount: record.offenseCount,
      evidence: record.evidence.map((ev) => ({
        id: ev.id,
        name: ev.fileName,
        url: ev.fileUrl,
        type: ev.fileType as 'image' | 'pdf' | 'file' | 'document',
        uploadedAt: ev.uploadedAt?.toISOString(),
      })),
      actions: record.actions,
    }));

    return {
      employeeId,
      employeeName: employee
        ? `${employee.FirstName} ${employee.MiddleName || ''} ${employee.LastName}`.trim()
        : 'Unknown',
      totalCases,
      ongoingCount,
      pendingCount: forReviewCount,
      resolvedCount,
      closedCount,
      lastUpdated: records.length > 0 ? records[0].updatedAt.toISOString() : new Date().toISOString(),
      offenses: transformedOffenses,
    };
  }

  /**
   * Get all employees with disciplinary records (grouped by employee)
   */
  async getAllEmployeesWithDisciplinaryRecords() {
    // Get all unique employee IDs that have disciplinary records
    const records = await prisma.disciplinaryRecord.findMany({
      select: {
        employeeId: true,
      },
      distinct: ['employeeId'],
    });

    const employeeIds = records.map((r) => r.employeeId);

    // For each employee, get their disciplinary history
    const employeeHistories = await Promise.all(
      employeeIds.map((employeeId) => this.getEmployeeDisciplinaryHistory(employeeId))
    );

    // Sort by last updated date (most recent first)
    employeeHistories.sort((a, b) => {
      const dateA = new Date(a.lastUpdated).getTime();
      const dateB = new Date(b.lastUpdated).getTime();
      return dateB - dateA;
    });

    return employeeHistories;
  }

  /**
   * Acknowledge a disciplinary record digitally
   */
  async acknowledgeDisciplinaryRecord(id: string, acknowledgedBy?: string) {
    const record = await prisma.disciplinaryRecord.update({
      where: { id },
      data: {
        digitalAcknowledgment: true,
        acknowledgedAt: new Date(),
        updatedBy: acknowledgedBy,
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
    });

    return record;
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStatistics() {
    const [
      totalRecords,
      ongoingRecords,
      forReviewRecords,
      resolvedRecords,
      closedRecords,
      minorRecords,
      moderateRecords,
      majorRecords,
    ] = await Promise.all([
      prisma.disciplinaryRecord.count(),
      prisma.disciplinaryRecord.count({ where: { status: DisciplinaryStatus.Ongoing } }),
      prisma.disciplinaryRecord.count({ where: { status: DisciplinaryStatus.For_Review } }),
      prisma.disciplinaryRecord.count({ where: { status: DisciplinaryStatus.Resolved } }),
      prisma.disciplinaryRecord.count({ where: { status: DisciplinaryStatus.Closed } }),
      prisma.disciplinaryRecord.count({ where: { severity: DisciplinarySeverity.Minor } }),
      prisma.disciplinaryRecord.count({ where: { severity: DisciplinarySeverity.Moderate } }),
      prisma.disciplinaryRecord.count({ where: { severity: DisciplinarySeverity.Major } }),
    ]);

    // Get records by category
    const recordsByCategory = await prisma.disciplinaryRecord.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
    });

    // Get recent records (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRecords = await prisma.disciplinaryRecord.count({
      where: {
        dateTime: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return {
      totalRecords,
      statusBreakdown: {
        ongoing: ongoingRecords,
        forReview: forReviewRecords,
        resolved: resolvedRecords,
        closed: closedRecords,
      },
      severityBreakdown: {
        minor: minorRecords,
        moderate: moderateRecords,
        major: majorRecords,
      },
      categoryBreakdown: recordsByCategory.map((item) => ({
        category: item.category,
        count: item._count.id,
      })),
      recentRecords,
    };
  }
}

export const disciplinaryService = new DisciplinaryService();

