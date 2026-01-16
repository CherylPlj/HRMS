import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { timeRangesOverlap } from '@/lib/timeUtils';
import { syncAssignmentToSIS } from '@/lib/sisSync';

const scheduleSchema = z.object({
  facultyId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  classSectionId: z.number().int().positive(),
  day: z.string().min(1),
  time: z.string().min(1),
  duration: z.number().positive().min(0.5, 'Duration must be at least 0.5 hours').max(5, 'Duration cannot exceed 5 hours per subject per day'),
  sisScheduleId: z.number().int().positive().optional(), // Optional SIS schedule ID for syncing
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

    // First check if the schedule exists and has a valid classSection
    const scheduleExists = await prisma.schedules.findUnique({
      where: { id: scheduleId },
      select: { classSectionId: true },
    });

    if (!scheduleExists) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Check if the classSection still exists
    const classSectionExists = await prisma.classSection.findUnique({
      where: { id: scheduleExists.classSectionId },
      select: { id: true },
    });

    if (!classSectionExists) {
      return NextResponse.json(
        { error: 'Schedule references a deleted class section' },
        { status: 404 }
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

    // Validation 1: Check if teacher has overlapping time on the same day
    // Teachers cannot have two subjects at the same time and same day (excluding current schedule)
    const existingFacultySchedules = await prisma.schedules.findMany({
      where: {
        id: { not: scheduleId },
        facultyId: validatedData.facultyId,
        day: validatedData.day,
      },
      include: {
        subject: true,
      },
    });

    // Check for overlapping times (not just exact matches)
    for (const existingSchedule of existingFacultySchedules) {
      if (timeRangesOverlap(existingSchedule.time, validatedData.time)) {
        // Any overlapping time on the same day is a conflict, regardless of subject
        const subject = await prisma.subject.findUnique({
          where: { id: validatedData.subjectId },
        });
        return NextResponse.json(
          {
            error: 'Schedule conflict detected',
            message: `Teacher already has ${existingSchedule.subject.name} scheduled at ${validatedData.day} ${existingSchedule.time}. Cannot assign ${subject?.name || 'this subject'} at overlapping time ${validatedData.time} on the same day.`,
          },
          { status: 400 }
        );
      }
    }

    // Validation 2: Check if section already has a different teacher at overlapping time
    // Two teachers cannot have same/overlapping time in one section
    const sectionSchedules = await prisma.schedules.findMany({
      where: {
        id: { not: scheduleId },
        classSectionId: validatedData.classSectionId,
        day: validatedData.day,
      },
      include: {
        faculty: {
          include: {
            User: {
              select: {
                FirstName: true,
                LastName: true,
              },
            },
          },
        },
        subject: true,
      },
    });

    for (const sectionSchedule of sectionSchedules) {
      if (timeRangesOverlap(sectionSchedule.time, validatedData.time)) {
        // If it's a different teacher, conflict (two teachers cannot be in same section at same time)
        if (sectionSchedule.facultyId !== validatedData.facultyId) {
          const otherTeacherName = `${sectionSchedule.faculty.User.FirstName} ${sectionSchedule.faculty.User.LastName}`;
          const classSection = await prisma.classSection.findUnique({
            where: { id: validatedData.classSectionId },
          });
          return NextResponse.json(
            {
              error: 'Schedule conflict detected',
              message: `Section ${classSection?.name || 'this section'} already has ${otherTeacherName} teaching ${sectionSchedule.subject.name} at ${validatedData.day} ${sectionSchedule.time}. Cannot assign another teacher at overlapping time ${validatedData.time}.`,
            },
            { status: 400 }
          );
        }
      }
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
            Employee: {
              select: {
                EmployeeID: true,
              },
            },
          },
        },
        subject: true,
        classSection: true,
      },
    });

    // Sync to SIS if SIS schedule ID is provided
    let syncResult = null;
    if (validatedData.sisScheduleId && updatedSchedule.faculty?.Employee?.EmployeeID) {
      try {
        syncResult = await syncAssignmentToSIS({
          scheduleId: validatedData.sisScheduleId,
          employeeId: updatedSchedule.faculty.Employee.EmployeeID,
          assigned: true,
        });
      } catch (syncError) {
        console.error('Error syncing to SIS:', syncError);
        // Don't fail the update if sync fails
        syncResult = {
          success: true,
          synced: false,
          message: syncError instanceof Error ? syncError.message : 'Failed to sync to SIS',
        };
      }
    }

    // Build response
    const response: any = {
      ...updatedSchedule,
    };

    if (syncResult) {
      response.sync = syncResult;
    }

    return NextResponse.json(response);
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
