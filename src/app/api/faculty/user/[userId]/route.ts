import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// `context` type is inferred correctly by Next.js
export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    const userId = params.userId;

    try {
        const faculty = await prisma.faculty.findFirst({
        where: {
            UserID: userId,
        },
        select: {
            FacultyID: true,
            UserID: true,
            DepartmentID: true,
            Position: true,
            EmploymentStatus: true,
        },
        });

        if (!faculty) {
        return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
        }

        return NextResponse.json(faculty);
    } catch (error) {
        return NextResponse.json(
        {
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
        );
    } finally {
        if (process.env.NODE_ENV === 'development') {
        await prisma.$disconnect();
        }
    }
}
