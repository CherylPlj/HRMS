import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await context.params;
        console.log('Fetching faculty for user ID:', userId);

        const faculty = await prisma.faculty.findFirst({
            where: {
                UserID: userId
            },
            select: {
                FacultyID: true,
                UserID: true,
                DepartmentID: true,
                Position: true,
                EmploymentStatus: true
            }
        });

        if (!faculty) {
            console.log('Faculty record not found for user:', userId);
            return NextResponse.json(
                { error: 'Faculty record not found' },
                { status: 404 }
            );
        }

        console.log('Found faculty record:', faculty);
        return NextResponse.json(faculty);
    } catch (error) {
        console.error('Error in faculty API:', error);
        // Handle Prisma-specific errors
        if (error instanceof Error) {
            if (error.message.includes('prisma')) {
                return NextResponse.json(
                    { error: 'Database error', details: error.message },
                    { status: 500 }
                );
            }
        }
        return NextResponse.json(
            { 
                error: 'Internal Server Error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    } finally {
        // Ensure connection cleanup in development
        if (process.env.NODE_ENV === 'development') {
            await prisma.$disconnect();
        }
    }
} 