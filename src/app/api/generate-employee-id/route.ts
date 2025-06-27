import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const currentYear = new Date().getFullYear();
    
    // Get all existing employees for this year
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

    // Get all existing users to check for UserID conflicts
    const existingUsers = await prisma.user.findMany({
      select: {
        UserID: true
      }
    });

    // Extract all numbers used in Employee IDs and User IDs for this year
    const usedNumbers = new Set<number>();
    
    // Process Employee IDs (format: YYYY-NNNN)
    existingEmployees.forEach(employee => {
      const match = employee.EmployeeID.match(new RegExp(`^${currentYear}-(\\d{4})$`));
      if (match) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    });

    // Process User IDs (multiple formats that could conflict)
    existingUsers.forEach(user => {
      const userId = user.UserID;
      
      // Pattern 1: YYYY-NNNN (same as employee format)
      const pattern1 = userId.match(new RegExp(`^${currentYear}-(\\d{4})$`));
      if (pattern1) {
        usedNumbers.add(parseInt(pattern1[1], 10));
      }
      
      // Pattern 2: USER-YYYY-NNNN
      const pattern2 = userId.match(new RegExp(`^USER-${currentYear}-(\\d{4})$`));
      if (pattern2) {
        usedNumbers.add(parseInt(pattern2[1], 10));
      }
      
      // Pattern 3: YYYYNNNN
      const pattern3 = userId.match(new RegExp(`^${currentYear}(\\d{4})$`));
      if (pattern3) {
        usedNumbers.add(parseInt(pattern3[1], 10));
      }
      
      // Pattern 4: YYYY-XXXX-YYYY (seeded data)
      const pattern4 = userId.match(new RegExp(`^${currentYear}-(\\d{4})-\\d{4}$`));
      if (pattern4) {
        usedNumbers.add(parseInt(pattern4[1], 10));
      }
    });

    // Find the next available number starting from 1
    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
      nextNumber++;
    }

    const employeeId = `${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
    
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