import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;


    // Get faculty ID from the employee ID (which is the UserID)
    const faculty = await prisma.faculty.findFirst({
      where: {
        UserID: parseInt(employeeId),
      },
    });

    if (!faculty) {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      );
    }

    type ScheduleWithDates = Awaited<ReturnType<typeof prisma.schedule.findMany>>[number];

    // Get the faculty's schedule
    const schedules = await prisma.schedule.findMany({
      where: {
        FacultyID: faculty.FacultyID,
      },
      orderBy: {
        DayOfWeek: 'asc',
      },
    });

    // Format the schedules for display
    const formattedSchedules = schedules.map((schedule: ScheduleWithDates) => ({
      day: schedule.DayOfWeek,
      timeIn: new Date(schedule.StartTime).toLocaleTimeString('en-US', { hour12: true }),
      timeOut: new Date(schedule.EndTime).toLocaleTimeString('en-US', { hour12: true }),
      status: 'SCHEDULED', // You might want to compute this based on attendance records
    }));

    return NextResponse.json(formattedSchedules);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}