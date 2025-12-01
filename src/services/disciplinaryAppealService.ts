import { prisma } from '@/lib/prisma';
import { AppealStatus, DisciplinaryActionStatus } from '@prisma/client';

export interface CreateAppealInput {
  disciplinaryActionId: string;
  employeeId: string;
  reason: string;
  supportingDocuments?: any; // JSON array of document references
}

export interface ReviewAppealInput {
  reviewedBy: string;
  status: AppealStatus;
  decision: string;
  decisionDate?: Date;
}

export class DisciplinaryAppealService {
  /**
   * Create a new appeal
   */
  async createAppeal(input: CreateAppealInput) {
    const appeal = await prisma.disciplinaryAppeal.create({
      data: {
        disciplinaryActionId: input.disciplinaryActionId,
        employeeId: input.employeeId,
        reason: input.reason,
        supportingDocuments: input.supportingDocuments,
        status: AppealStatus.Pending,
      },
      include: {
        disciplinaryAction: {
          include: {
            disciplinaryRecord: {
              select: {
                id: true,
                caseNo: true,
                employee: {
                  select: {
                    EmployeeID: true,
                    FirstName: true,
                    LastName: true,
                  },
                },
              },
            },
          },
        },
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
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
    });

    // Update the action status to Appealed if it's not already
    await prisma.disciplinaryAction.update({
      where: { id: input.disciplinaryActionId },
      data: {
        status: DisciplinaryActionStatus.Appealed,
      },
    });

    return appeal;
  }

  /**
   * Get all appeals for a disciplinary action
   */
  async getAppealsByActionId(disciplinaryActionId: string) {
    const appeals = await prisma.disciplinaryAppeal.findMany({
      where: { disciplinaryActionId },
      include: {
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
          },
        },
        reviewer: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        disciplinaryAction: {
          select: {
            id: true,
            actionType: true,
            description: true,
          },
        },
      },
      orderBy: {
        appealDate: 'desc',
      },
    });

    return appeals;
  }

  /**
   * Get all appeals for an employee
   */
  async getAppealsByEmployeeId(employeeId: string) {
    const appeals = await prisma.disciplinaryAppeal.findMany({
      where: { employeeId },
      include: {
        disciplinaryAction: {
          include: {
            disciplinaryRecord: {
              select: {
                id: true,
                caseNo: true,
              },
            },
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
    });

    return appeals;
  }

  /**
   * Get a single appeal by ID
   */
  async getAppealById(id: string) {
    const appeal = await prisma.disciplinaryAppeal.findUnique({
      where: { id },
      include: {
        disciplinaryAction: {
          include: {
            disciplinaryRecord: {
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
            },
          },
        },
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
            MiddleName: true,
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
    });

    return appeal;
  }

  /**
   * Review an appeal (update status and decision)
   */
  async reviewAppeal(id: string, input: ReviewAppealInput) {
    const appeal = await prisma.disciplinaryAppeal.update({
      where: { id },
      data: {
        reviewedBy: input.reviewedBy,
        reviewedAt: new Date(),
        status: input.status,
        decision: input.decision,
        decisionDate: input.decisionDate || new Date(),
      },
      include: {
        disciplinaryAction: {
          include: {
            disciplinaryRecord: {
              select: {
                id: true,
                caseNo: true,
              },
            },
          },
        },
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
    });

    // If appeal is approved, update the action status
    if (input.status === AppealStatus.Approved) {
      await prisma.disciplinaryAction.update({
        where: { id: appeal.disciplinaryActionId },
        data: {
          status: DisciplinaryActionStatus.Cancelled,
        },
      });
    }

    return appeal;
  }

  /**
   * Withdraw an appeal
   */
  async withdrawAppeal(id: string) {
    const appeal = await prisma.disciplinaryAppeal.update({
      where: { id },
      data: {
        status: AppealStatus.Withdrawn,
      },
      include: {
        disciplinaryAction: {
          include: {
            disciplinaryRecord: {
              select: {
                id: true,
                caseNo: true,
              },
            },
          },
        },
        employee: {
          select: {
            EmployeeID: true,
            FirstName: true,
            LastName: true,
          },
        },
      },
    });

    // Update action status back to Active if no other pending appeals
    const pendingAppeals = await prisma.disciplinaryAppeal.count({
      where: {
        disciplinaryActionId: appeal.disciplinaryActionId,
        status: AppealStatus.Pending,
      },
    });

    if (pendingAppeals === 0) {
      await prisma.disciplinaryAction.update({
        where: { id: appeal.disciplinaryActionId },
        data: {
          status: DisciplinaryActionStatus.Active,
        },
      });
    }

    return appeal;
  }

  /**
   * Delete an appeal
   */
  async deleteAppeal(id: string) {
    await prisma.disciplinaryAppeal.delete({
      where: { id },
    });

    return { success: true };
  }
}

export const disciplinaryAppealService = new DisciplinaryAppealService();

