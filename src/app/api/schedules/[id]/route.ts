import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const scheduleSchema = z.object({
  facultyId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  classSectionId: z.number().int().positive(),
  day: z.string().min(1),
  time: z.string().min(1),
  duration: z.number().positive().min(0.5, 'Duration must be at least 0.5 hours').max(5, 'Duration cannot exceed 5 hours per subject per day'),
});

// GET /api/schedules/[id] - Get single schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scheduleId = parseInt(id);

    if (isNaN(scheduleId)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID' },
        { status: 400 }
      );
    }

    const schedule = await prisma.schedules.findUnique({
      where: { id: scheduleId },
      include: {
        faculty: {
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
        },
        subject: true,
        classSection: true,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// PUT /api/schedules/[id] - Update schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scheduleId = parseInt(id);

    if (isNaN(scheduleId)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = scheduleSchema.parse(body);

    // Check if schedule exists
    const existingSchedule = await prisma.schedules.findUnique({
      where: { id: scheduleId },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Check for conflicts (excluding current schedule)
    const conflictingSchedule = await prisma.schedules.findFirst({
      where: {
        id: { not: scheduleId },
        facultyId: validatedData.facultyId,
        day: validatedData.day,
        time: validatedData.time,
      },
    });

    if (conflictingSchedule) {
      return NextResponse.json(
        {
          error: 'Schedule conflict detected',
          message: `Faculty already has a class scheduled at ${validatedData.day} ${validatedData.time}`,
        },
        { status: 400 }
      );
    }

    // Update schedule
    const updatedSchedule = await prisma.schedules.update({
      where: { id: scheduleId },
      data: {
        facultyId: validatedData.facultyId,
        subjectId: validatedData.subjectId,
        classSectionId: validatedData.classSectionId,
        day: validatedData.day,
        time: validatedData.time,
        duration: validatedData.duration,
      },
      include: {
        faculty: {
          include: {
            User: {
              select: {
                FirstName: true,
                LastName: true,
                Email: true,
              },
            },
          },
        },
        subject: true,
        classSection: true,
      },
    });

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE /api/schedules/[id] - Delete schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scheduleId = parseInt(id);

    if (isNaN(scheduleId)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID' },
        { status: 400 }
      );
    }

    // Check if schedule exists
    const existingSchedule = await prisma.schedules.findUnique({
      where: { id: scheduleId },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Delete schedule
    await prisma.schedules.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json(
      { message: 'Schedule deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}
