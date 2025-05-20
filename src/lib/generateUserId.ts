import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function generateUserId(hireDate: Date): Promise<string> {
    const year = hireDate.getFullYear();

    // Count how many users already exist in that year
    const users = await prisma.user.findMany({
        where: {
        UserID: {
            startsWith: `${year}-`
        }
        },
        select: {
        UserID: true
        }
    });

    // Get the highest 4-digit number already used
    const maxNumber = users.reduce((max: number, user: { UserID: string }) => {
        const match = user.UserID.match(/-(\d{4})$/);
        const number = match ? parseInt(match[1], 10) : 0;
        return Math.max(max, number);
    }, 0);

    const newNumber = (maxNumber + 1).toString().padStart(4, '0');

    return `${year}-${newNumber}`;
}
