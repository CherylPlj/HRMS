import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/schedules/faculty/[facultyId] - Get all schedules for a specific faculty
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ facultyId: string }> }
) {
  try {
    const { facultyId: facultyIdParam } = await params;
    const facultyId = parseInt(facultyIdParam);

    if (isNaN(facultyId)) {
      return NextResponse.json(
        { error: 'Invalid faculty ID' },
        { status: 400 }
      );
    }

    // Check if faculty exists
    const faculty = await prisma.faculty.findUnique({
      where: { FacultyID: facultyId },
      include: {
        User: {
          select: {
            FirstName: true,
            LastName: true,
            Email: true,
          },
        },
        Department: true,
      },
    });

    if (!faculty) {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      );
    }

    // Get all schedules for this faculty
    const schedules = await prisma.schedules.findMany({
      where: { facultyId },
      include: {
        subject: true,
        classSection: true,
      },
      orderBy: [
        { day: 'asc' },
        { time: 'asc' },
      ],
    });

    // Calculate total hours per week
    const totalHoursPerWeek = schedules.reduce(
      (sum, schedule) => sum + schedule.duration,
      0
    );

    // Group schedules by day
    const schedulesByDay = schedules.reduce((acc, schedule) => {
      const day = schedule.day;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(schedule);
      return acc;
    }, {} as Record<string, typeof schedules>);

    return NextResponse.json({
      faculty: {
        id: faculty.FacultyID,
        employeeId: faculty.EmployeeID,
        name: `${faculty.User?.FirstName || ''} ${faculty.User?.LastName || ''}`.trim(),
        email: faculty.User?.Email,
        department: faculty.Department?.DepartmentName,
        position: faculty.Position,
        employmentStatus: faculty.EmploymentStatus,
      },
      schedules,
      schedulesByDay,
      summary: {
        totalSections: schedules.length,
        totalHoursPerWeek,
      },
    });
  } catch (error) {
    console.error('Error fetching faculty schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch faculty schedules' },
      { status: 500 }
    );
  }
}
