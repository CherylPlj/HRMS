import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/class-sections - Get all class sections
// Query param: includeAssignments=true to include adviser, homeroom, and section head data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAssignments = searchParams.get('includeAssignments') === 'true';

    const classSections = await prisma.classSection.findMany({
      include: includeAssignments
        ? {
            adviserFaculty: {
              include: {
                User: {
                  select: {
                    FirstName: true,
                    LastName: true,
                    Email: true,
                  },
                },
                Employee: {
                  select: {
                    EmployeeID: true,
                  },
                },
              },
            },
            homeroomTeacher: {
              include: {
                User: {
                  select: {
                    FirstName: true,
                    LastName: true,
                    Email: true,
                  },
                },
                Employee: {
                  select: {
                    EmployeeID: true,
                  },
                },
              },
            },
            sectionHead: {
              include: {
                User: {
                  select: {
                    FirstName: true,
                    LastName: true,
                    Email: true,
                  },
                },
                Employee: {
                  select: {
                    EmployeeID: true,
                  },
                },
              },
            },
          }
        : undefined,
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(classSections);
  } catch (error) {
    console.error('Error fetching class sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class sections' },
      { status: 500 }
    );
  }
}
