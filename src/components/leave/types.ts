import type { Leave, Faculty, User as PrismaUser, Department } from '@prisma/client';
import { LeaveStatus } from '@prisma/client';

export interface LeaveTypeItem {
    LeaveTypeID: number;
    LeaveTypeName: string;
    NumberOfDays?: number | null;
    IsActive?: boolean;
}

export type LeaveWithRelations = Leave & {
    Faculty: (Faculty & {
        User: Pick<PrismaUser, 'FirstName' | 'LastName' | 'UserID'> | null;
        Department: Pick<Department, 'DepartmentName'> | null;
    }) | null;
};

export type TransformedLeave = Omit<LeaveWithRelations, 'Faculty'> & {
    Faculty: {
        Name: string;
        Department: string;
        UserID: string | null;
    };
    DocumentUrl?: string | null;
    RequestType: 'Leave' | 'Undertime';
    LeaveType?: 'Sick' | 'Vacation' | 'Emergency' | null;
    employeeSignature?: string | null;
    departmentHeadSignature?: string | null;
    TimeIn?: string | null;
    TimeOut?: string | null;
};

export { LeaveStatus };

