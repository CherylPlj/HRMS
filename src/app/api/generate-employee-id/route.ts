import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const currentYear = new Date().getFullYear();
    
    // Count all existing employees to determine the next number
    const existingEmployees = await prisma.employee.findMany({
      where: {
        EmployeeID: {
          startsWith: `${currentYear}-`
        }
      },
      select: {
        EmployeeID: true
      }
    });

    // Find the highest number used for this year
    const maxNumber = existingEmployees.reduce((max: number, employee: { EmployeeID: string }) => {
      const match = employee.EmployeeID.match(/-(\d{4})$/);
      const number = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, number);
    }, 0);

    // Generate the next sequential number
    const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
    const employeeId = `${currentYear}-${nextNumber}`;
    
    return NextResponse.json({ employeeId });
  } catch (error) {
    console.error('Error generating employee ID:', error);
    return NextResponse.json(
      { error: 'Failed to generate employee ID' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 