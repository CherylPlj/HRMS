import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixEmptyUserIDs() {
  try {
    console.log('Starting to fix empty UserID strings...');

    // Find all employees with empty string UserIDs
    const employeesWithEmptyUserID = await prisma.employee.findMany({
      where: {
        UserID: ''
      },
      select: {
        EmployeeID: true,
        UserID: true
      }
    });

    console.log(`Found ${employeesWithEmptyUserID.length} employees with empty UserID strings`);

    if (employeesWithEmptyUserID.length > 0) {
      // Update all employees with empty UserID to null
      const updateResult = await prisma.employee.updateMany({
        where: {
          UserID: ''
        },
        data: {
          UserID: null
        }
      });

      console.log(`Successfully updated ${updateResult.count} employee records`);
      
      // Also check for employees with whitespace-only UserIDs
      const employeesWithWhitespaceUserID = await prisma.employee.findMany({
        where: {
          AND: [
            { UserID: { not: null } },
            { UserID: { not: '' } }
          ]
        },
        select: {
          EmployeeID: true,
          UserID: true
        }
      });

      // Filter out those with only whitespace
      const whitespaceOnly = employeesWithWhitespaceUserID.filter(emp => 
        emp.UserID && emp.UserID.trim() === ''
      );

      if (whitespaceOnly.length > 0) {
        console.log(`Found ${whitespaceOnly.length} employees with whitespace-only UserIDs`);
        
        // Update these to null as well
        const whitespaceUpdateResult = await prisma.employee.updateMany({
          where: {
            AND: [
              { UserID: { not: null } },
              { UserID: { not: '' } }
            ]
          },
          data: {
            UserID: null
          }
        });

        console.log(`Successfully updated ${whitespaceUpdateResult.count} employee records with whitespace-only UserIDs`);
      }
    }

    // Also check for any duplicate UserIDs (shouldn't happen with unique constraint, but just in case)
    const allEmployees = await prisma.employee.findMany({
      where: {
        UserID: {
          not: null
        }
      },
      select: {
        EmployeeID: true,
        UserID: true
      },
      orderBy: {
        UserID: 'asc'
      }
    });

    const userIDCounts = new Map<string, number>();
    allEmployees.forEach(emp => {
      if (emp.UserID) {
        userIDCounts.set(emp.UserID, (userIDCounts.get(emp.UserID) || 0) + 1);
      }
    });

    const duplicates = Array.from(userIDCounts.entries()).filter(([_, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate UserIDs:`);
      duplicates.forEach(([userID, count]) => {
        console.log(`  UserID "${userID}" appears ${count} times`);
      });
    } else {
      console.log('No duplicate UserIDs found');
    }

    console.log('UserID cleanup completed successfully!');
  } catch (error) {
    console.error('Error fixing empty UserIDs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixEmptyUserIDs(); 