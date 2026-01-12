import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const scheduleSchema = z.object({
  facultyId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  classSectionId: z.number().int().positive(),
  day: z.string().min(1),
  time: z.string().min(1),
  duration: z.number().positive().min(0.5, 'Duration must be at least 0.5 hours').max(5, 'Duration cannot exceed 5 hours per subject per day'),
});

// GET /api/schedules - Get all schedules
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const facultyId = searchParams.get('facultyId');
    const day = searchParams.get('day');

    const where: any = {};
    
    if (facultyId) {
      where.facultyId = parseInt(facultyId);
    }
    
    if (day) {
      where.day = day;
    }

    const schedules = await prisma.schedules.findMany({
      where,
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
      orderBy: [
        { day: 'asc' },
        { time: 'asc' },
      ],
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST /api/schedules - Create new schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = scheduleSchema.parse(body);

    // Check if faculty exists
    const faculty = await prisma.faculty.findUnique({
      where: { FacultyID: validatedData.facultyId },
      include: {
        User: true,
      },
    });

    if (!faculty) {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      );
    }

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: validatedData.subjectId },
    });

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    // Check if class section exists
    const classSection = await prisma.classSection.findUnique({
      where: { id: validatedData.classSectionId },
    });

    if (!classSection) {
      return NextResponse.json(
        { error: 'Class section not found' },
        { status: 404 }
      );
    }

    // Check for schedule conflicts (same faculty, day, and time)
    const conflictingSchedule = await prisma.schedules.findFirst({
      where: {
        facultyId: validatedData.facultyId,
        day: validatedData.day,
        time: validatedData.time,
      },
    });

    if (conflictingSchedule) {
      return NextResponse.json(
        { 
          error: 'Schedule conflict detected',
          message: `Faculty already has a class scheduled at ${validatedData.day} ${validatedData.time}`
        },
        { status: 400 }
      );
    }

    // Create schedule
    const newSchedule = await prisma.schedules.create({
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

    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}
