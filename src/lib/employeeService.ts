'use server';

import { prisma } from '@/lib/prisma';

export async function getEmployeeData(employeeId: string) {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        EmployeeID: employeeId,
      },
      include: {
        employmentDetails: true,
        contactInfo: true,
        governmentIds: true,
        Department: {
          select: {
            DepartmentName: true,
            type: true,
          },
        },
        Family: true,
        skills: true,
        MedicalInfo: true,
        Education: true,
        EmploymentHistory: true,
        certificates: true,
      },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    return {
      success: true,
      data: employee,
    };
  } catch (error) {
    console.error('Error fetching employee data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateEmployeeData(employeeId: string, data: any) {
  try {
    const updatedEmployee = await prisma.employee.update({
      where: {
        EmployeeID: employeeId,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      data: updatedEmployee,
    };
  } catch (error) {
    console.error('Error updating employee data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
} 