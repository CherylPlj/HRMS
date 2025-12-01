import { prisma } from '@/lib/prisma';
import { DisciplinaryActionType, DisciplinaryActionStatus } from '@prisma/client';

export interface CreateDisciplinaryActionInput {
  disciplinaryRecordId: string;
  actionType: DisciplinaryActionType;
  effectiveDate: Date;
  endDate?: Date;
  description: string;
  status?: DisciplinaryActionStatus;
  notes?: string;
  createdBy?: string;
}

export interface UpdateDisciplinaryActionInput {
  actionType?: DisciplinaryActionType;
  effectiveDate?: Date;
  endDate?: Date;
  description?: string;
  status?: DisciplinaryActionStatus;
  notes?: string;
  updatedBy?: string;
}

export interface ApproveActionInput {
  approvedBy: string;
  approvedAt?: Date;
}

export class DisciplinaryActionService {
  /**
   * Create a new disciplinary action
   */
  async createAction(input: CreateDisciplinaryActionInput) {
    const action = await prisma.disciplinaryAction.create({
      data: {
        disciplinaryRecordId: input.disciplinaryRecordId,
        actionType: input.actionType,
        effectiveDate: input.effectiveDate,
        endDate: input.endDate,
        description: input.description,
        status: input.status || DisciplinaryActionStatus.Pending,
        notes: input.notes,
        createdBy: input.createdBy,
      },
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
        approver: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        appeals: true,
      },
    });

    return action;
  }

  /**
   * Get all actions for a disciplinary record
   */
  async getActionsByRecordId(disciplinaryRecordId: string) {
    const actions = await prisma.disciplinaryAction.findMany({
      where: { disciplinaryRecordId },
      include: {
        approver: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
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
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    return actions;
  }

  /**
   * Get a single action by ID
   */
  async getActionById(id: string) {
    const action = await prisma.disciplinaryAction.findUnique({
      where: { id },
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
        approver: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
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
      },
    });

    return action;
  }

  /**
   * Update a disciplinary action
   */
  async updateAction(id: string, input: UpdateDisciplinaryActionInput) {
    const updateData: any = {};

    if (input.actionType !== undefined) updateData.actionType = input.actionType;
    if (input.effectiveDate !== undefined) updateData.effectiveDate = input.effectiveDate;
    if (input.endDate !== undefined) updateData.endDate = input.endDate;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.updatedBy !== undefined) updateData.updatedBy = input.updatedBy;

    const action = await prisma.disciplinaryAction.update({
      where: { id },
      data: updateData,
      include: {
        disciplinaryRecord: {
          select: {
            id: true,
            caseNo: true,
          },
        },
        approver: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        appeals: true,
      },
    });

    return action;
  }

  /**
   * Approve a disciplinary action
   */
  async approveAction(id: string, input: ApproveActionInput) {
    const action = await prisma.disciplinaryAction.update({
      where: { id },
      data: {
        approvedBy: input.approvedBy,
        approvedAt: input.approvedAt || new Date(),
        status: DisciplinaryActionStatus.Active,
        updatedBy: input.approvedBy,
      },
      include: {
        disciplinaryRecord: {
          select: {
            id: true,
            caseNo: true,
          },
        },
        approver: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        appeals: true,
      },
    });

    return action;
  }

  /**
   * Complete a disciplinary action
   */
  async completeAction(id: string, completedBy?: string) {
    const action = await prisma.disciplinaryAction.update({
      where: { id },
      data: {
        status: DisciplinaryActionStatus.Completed,
        completedAt: new Date(),
        updatedBy: completedBy,
      },
      include: {
        disciplinaryRecord: {
          select: {
            id: true,
            caseNo: true,
          },
        },
        approver: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        appeals: true,
      },
    });

    return action;
  }

  /**
   * Cancel a disciplinary action
   */
  async cancelAction(id: string, cancelledBy?: string) {
    const action = await prisma.disciplinaryAction.update({
      where: { id },
      data: {
        status: DisciplinaryActionStatus.Cancelled,
        updatedBy: cancelledBy,
      },
      include: {
        disciplinaryRecord: {
          select: {
            id: true,
            caseNo: true,
          },
        },
        approver: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        appeals: true,
      },
    });

    return action;
  }

  /**
   * Delete a disciplinary action
   */
  async deleteAction(id: string) {
    // This will cascade delete appeals due to onDelete: Cascade
    await prisma.disciplinaryAction.delete({
      where: { id },
    });

    return { success: true };
  }
}

export const disciplinaryActionService = new DisciplinaryActionService();

