import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// GET /api/class-sections/[id]/assignments - Get assignments for a specific section
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sectionId = parseInt(id);

    if (isNaN(sectionId)) {
      return NextResponse.json(
        { error: 'Invalid section ID' },
        { status: 400 }
      );
    }

    const section = await prisma.classSection.findUnique({
      where: { id: sectionId },
      include: {
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
      },
    });

    if (!section) {
      return NextResponse.json(
        { error: 'Class section not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sectionId: section.id,
      sectionName: section.name,
      adviser: section.adviserFaculty ? {
        facultyId: section.adviserFaculty.FacultyID,
        employeeId: section.adviserFaculty.Employee?.EmployeeID,
        firstName: section.adviserFaculty.User.FirstName,
        lastName: section.adviserFaculty.User.LastName,
        email: section.adviserFaculty.User.Email,
      } : null,
      homeroomTeacher: section.homeroomTeacher ? {
        facultyId: section.homeroomTeacher.FacultyID,
        employeeId: section.homeroomTeacher.Employee?.EmployeeID,
        firstName: section.homeroomTeacher.User.FirstName,
        lastName: section.homeroomTeacher.User.LastName,
        email: section.homeroomTeacher.User.Email,
      } : null,
      sectionHead: section.sectionHead ? {
        facultyId: section.sectionHead.FacultyID,
        employeeId: section.sectionHead.Employee?.EmployeeID,
        firstName: section.sectionHead.User.FirstName,
        lastName: section.sectionHead.User.LastName,
        email: section.sectionHead.User.Email,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching section assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch section assignments' },
      { status: 500 }
    );
  }
}

// PUT /api/class-sections/[id]/assignments - Update assignments for a specific section
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const sectionId = parseInt(id);

    if (isNaN(sectionId)) {
      return NextResponse.json(
        { error: 'Invalid section ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { adviserFacultyId, homeroomTeacherId, sectionHeadId } = body;

    // Validate that the section exists
    const existingSection = await prisma.classSection.findUnique({
      where: { id: sectionId },
    });

    if (!existingSection) {
      return NextResponse.json(
        { error: 'Class section not found' },
        { status: 404 }
      );
    }

    // Validate faculty IDs if provided
    if (adviserFacultyId !== null && adviserFacultyId !== undefined) {
      const faculty = await prisma.faculty.findUnique({
        where: { FacultyID: adviserFacultyId },
      });
      if (!faculty) {
        return NextResponse.json(
          { error: `Faculty with ID ${adviserFacultyId} not found` },
          { status: 404 }
        );
      }
    }

    if (homeroomTeacherId !== null && homeroomTeacherId !== undefined) {
      const faculty = await prisma.faculty.findUnique({
        where: { FacultyID: homeroomTeacherId },
      });
      if (!faculty) {
        return NextResponse.json(
          { error: `Faculty with ID ${homeroomTeacherId} not found` },
          { status: 404 }
        );
      }
    }

    if (sectionHeadId !== null && sectionHeadId !== undefined) {
      const faculty = await prisma.faculty.findUnique({
        where: { FacultyID: sectionHeadId },
      });
      if (!faculty) {
        return NextResponse.json(
          { error: `Faculty with ID ${sectionHeadId} not found` },
          { status: 404 }
        );
      }
    }

    // Update the section
    const updatedSection = await prisma.classSection.update({
      where: { id: sectionId },
      data: {
        adviserFacultyId: adviserFacultyId === null ? null : adviserFacultyId,
        homeroomTeacherId: homeroomTeacherId === null ? null : homeroomTeacherId,
        sectionHeadId: sectionHeadId === null ? null : sectionHeadId,
      },
      include: {
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
      },
    });

    return NextResponse.json({
      sectionId: updatedSection.id,
      sectionName: updatedSection.name,
      adviser: updatedSection.adviserFaculty ? {
        facultyId: updatedSection.adviserFaculty.FacultyID,
        employeeId: updatedSection.adviserFaculty.Employee?.EmployeeID,
        firstName: updatedSection.adviserFaculty.User.FirstName,
        lastName: updatedSection.adviserFaculty.User.LastName,
        email: updatedSection.adviserFaculty.User.Email,
      } : null,
      homeroomTeacher: updatedSection.homeroomTeacher ? {
        facultyId: updatedSection.homeroomTeacher.FacultyID,
        employeeId: updatedSection.homeroomTeacher.Employee?.EmployeeID,
        firstName: updatedSection.homeroomTeacher.User.FirstName,
        lastName: updatedSection.homeroomTeacher.User.LastName,
        email: updatedSection.homeroomTeacher.User.Email,
      } : null,
      sectionHead: updatedSection.sectionHead ? {
        facultyId: updatedSection.sectionHead.FacultyID,
        employeeId: updatedSection.sectionHead.Employee?.EmployeeID,
        firstName: updatedSection.sectionHead.User.FirstName,
        lastName: updatedSection.sectionHead.User.LastName,
        email: updatedSection.sectionHead.User.Email,
      } : null,
    });
  } catch (error) {
    console.error('Error updating section assignments:', error);
    return NextResponse.json(
      { error: 'Failed to update section assignments' },
      { status: 500 }
    );
  }
}
