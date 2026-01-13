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

    // Validate faculty IDs if provided and get adviser name
    let adviserName: string | null | undefined = undefined; // undefined means don't update
    if (adviserFacultyId !== undefined) {
      if (adviserFacultyId !== null && adviserFacultyId !== 0) {
        const faculty = await prisma.faculty.findUnique({
          where: { FacultyID: adviserFacultyId },
          include: {
            User: {
              select: {
                FirstName: true,
                LastName: true,
              },
            },
          },
        });
        if (!faculty) {
          return NextResponse.json(
            { error: `Faculty with ID ${adviserFacultyId} not found` },
            { status: 404 }
          );
        }
        
        // Check advisory class limit (max 4 per teacher)
        // Exclude the current section from count (allows updating the same section)
        const existingAdvisoryCount = await prisma.classSection.count({
          where: {
            adviserFacultyId: adviserFacultyId,
            id: {
              not: sectionId,
            },
          },
        });
        
        if (existingAdvisoryCount >= 4) {
          const teacherName = `${faculty.User.FirstName} ${faculty.User.LastName}`.trim();
          return NextResponse.json(
            { 
              error: `Teacher ${teacherName} already has ${existingAdvisoryCount} advisory classes. Maximum allowed is 4 advisory classes per teacher.` 
            },
            { status: 400 }
          );
        }
        
        // Get the adviser's full name
        adviserName = `${faculty.User.FirstName} ${faculty.User.LastName}`.trim();
      } else {
        // Explicitly clear the adviser name when adviser is removed (set to null)
        adviserName = null;
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

    // Prepare update data
    const updateData: any = {};
    
    // Only update fields that are explicitly provided in the request
    if (adviserFacultyId !== undefined) {
      updateData.adviserFacultyId = adviserFacultyId;
      // Always update adviser name when adviserFacultyId is provided (even if null to clear it)
      if (adviserName !== undefined) {
        updateData.adviser = adviserName;
      }
    }
    
    if (homeroomTeacherId !== undefined) {
      updateData.homeroomTeacherId = homeroomTeacherId;
    }
    
    if (sectionHeadId !== undefined) {
      updateData.sectionHeadId = sectionHeadId;
    }

    // Update the section
    const updatedSection = await prisma.classSection.update({
      where: { id: sectionId },
      data: updateData,
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

    // Assignment is stored in HRMS database
    // SIS will fetch assignments from HRMS when needed via the /api/xr/section-assignments endpoint
    console.log(`[Section Assignments] Assignment updated in HRMS for section ${updatedSection.name}. SIS can fetch via /api/xr/section-assignments`);

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
