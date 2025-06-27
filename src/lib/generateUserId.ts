import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function generateUserId(hireDate: Date): Promise<string> {
    const year = hireDate.getFullYear();

    // Get ALL users (including soft-deleted) to check against all possible UserID formats
    // We include soft-deleted users to avoid reusing UserIDs when they might be reactivated
    const allUsers = await prisma.user.findMany({
        select: {
            UserID: true,
            isDeleted: true
        }
    });

    // Get ALL employees to check for EmployeeID conflicts
    const allEmployees = await prisma.employee.findMany({
        select: {
            EmployeeID: true
        }
    });

    // Extract all numbers used in any UserID or EmployeeID format for this year
    const usedNumbers = new Set<number>();
    
    // Process User IDs
    allUsers.forEach(user => {
        const userId = user.UserID;
        
        // Pattern 1: YYYY-NNNN (our target format)
        const pattern1 = userId.match(new RegExp(`^${year}-(\\d{4})$`));
        if (pattern1) {
            const number = parseInt(pattern1[1], 10);
            usedNumbers.add(number);
        }
        
        // Pattern 2: USER-YYYY-NNNN (from createUser API)
        const pattern2 = userId.match(new RegExp(`^USER-${year}-(\\d{4})$`));
        if (pattern2) {
            const number = parseInt(pattern2[1], 10);
            usedNumbers.add(number);
        }
        
        // Pattern 3: YYYYNNNN (from email-based creation)
        const pattern3 = userId.match(new RegExp(`^${year}(\\d{4})$`));
        if (pattern3) {
            const number = parseInt(pattern3[1], 10);
            usedNumbers.add(number);
        }
        
        // Pattern 4: YYYY-XXXX-YYYY (from seeded data)
        // For this pattern, we'll extract the first 4-digit group after the year
        const pattern4 = userId.match(new RegExp(`^${year}-(\\d{4})-\\d{4}$`));
        if (pattern4) {
            const number = parseInt(pattern4[1], 10);
            usedNumbers.add(number);
        }
        
        // Pattern 5: Any other format that starts with the year and contains 4 digits
        const otherPattern = userId.match(new RegExp(`^${year}.*?(\\d{4})`));
        if (otherPattern) {
            const number = parseInt(otherPattern[1], 10);
            usedNumbers.add(number);
        }
    });

    // Process Employee IDs (format: YYYY-NNNN)
    allEmployees.forEach(employee => {
        const employeeId = employee.EmployeeID;
        
        // Extract number from Employee ID format: YYYY-NNNN
        const match = employeeId.match(new RegExp(`^${year}-(\\d{4})$`));
        if (match) {
            const number = parseInt(match[1], 10);
            usedNumbers.add(number);
        }
    });

    // Find the next available number starting from 1
    let newNumber = 1;
    while (usedNumbers.has(newNumber)) {
        newNumber++;
    }

    const generatedUserId = `${year}-${newNumber.toString().padStart(4, '0')}`;
    return generatedUserId;
}
