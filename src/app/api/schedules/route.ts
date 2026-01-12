import { NextRequest, NextResponse } from 'next/server';
import { prisma, handlePreparedStatementError } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema - supports both single day and multiple days
const scheduleSchema = z.object({
  facultyId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  classSectionId: z.number().int().positive(),
  day: z.string().min(1).optional(), // For single day (edit mode or backward compatibility)
  days: z.array(z.string().min(1)).min(1).optional(), // For multiple days (new mode)
  time: z.string().min(1),
  duration: z.number().positive().min(0.5, 'Duration must be at least 0.5 hours').max(5, 'Duration cannot exceed 5 hours per subject per day'),
}).refine(
  (data) => data.day || (data.days && data.days.length > 0),
  {
    message: "Either 'day' or 'days' must be provided",
    path: ["day"],
  }
);

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

    const schedules = await handlePreparedStatementError(() =>
      prisma.schedules.findMany({
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
      })
    );

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST /api/schedules - Create new schedule(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if it's an array (multiple schedules) or single schedule
    const isArray = Array.isArray(body);
    const schedulesToProcess = isArray ? body : [body];

    // Validate all schedules
    const validatedSchedules = schedulesToProcess.map((scheduleData, index) => {
      try {
        return scheduleSchema.parse(scheduleData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Validation error for schedule ${index + 1}: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw error;
      }
    });

    // Process all schedules
    const createdSchedules = [];
    const errors = [];

    for (let i = 0; i < validatedSchedules.length; i++) {
      const validatedData = validatedSchedules[i];
      
      try {
        // Determine which days to process
        const daysToProcess = validatedData.days && validatedData.days.length > 0 
          ? validatedData.days 
          : [validatedData.day!]; // If days array not provided, use single day

        // Check if faculty exists
        const faculty = await handlePreparedStatementError(() =>
          prisma.faculty.findUnique({
            where: { FacultyID: validatedData.facultyId },
            include: {
              User: true,
            },
          })
        );

        if (!faculty) {
          errors.push({ index: i, error: 'Faculty not found' });
          continue;
        }

        // Check if subject exists
        const subject = await handlePreparedStatementError(() =>
          prisma.subject.findUnique({
            where: { id: validatedData.subjectId },
          })
        );

        if (!subject) {
          errors.push({ index: i, error: 'Subject not found' });
          continue;
        }

        // Check if class section exists
        const classSection = await handlePreparedStatementError(() =>
          prisma.classSection.findUnique({
            where: { id: validatedData.classSectionId },
          })
        );

        if (!classSection) {
          errors.push({ index: i, error: 'Class section not found' });
          continue;
        }

        // Check for schedule conflicts for all days
        const conflictingSchedules = await handlePreparedStatementError(() =>
          prisma.schedules.findMany({
            where: {
              facultyId: validatedData.facultyId,
              day: { in: daysToProcess },
              time: validatedData.time,
            },
          })
        );

        if (conflictingSchedules.length > 0) {
          const conflictingDays = conflictingSchedules.map(s => s.day).join(', ');
          errors.push({ 
            index: i, 
            error: 'Schedule conflict detected',
            message: `Faculty already has a class scheduled at ${conflictingDays} ${validatedData.time}`
          });
          continue;
        }

        // Create schedules for each day
        for (const day of daysToProcess) {
          const newSchedule = await handlePreparedStatementError(() =>
            prisma.schedules.create({
              data: {
                facultyId: validatedData.facultyId,
                subjectId: validatedData.subjectId,
                classSectionId: validatedData.classSectionId,
                day: day,
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
            })
          );
          createdSchedules.push(newSchedule);
        }
      } catch (error: any) {
        errors.push({ 
          index: i, 
          error: error.message || 'Failed to create schedule' 
        });
      }
    }

    // Return appropriate response
    if (createdSchedules.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to create schedules',
          details: errors
        },
        { status: 400 }
      );
    }

    if (errors.length > 0) {
      // Partial success
      return NextResponse.json(
        { 
          schedules: createdSchedules,
          errors: errors,
          message: `Created ${createdSchedules.length} schedule(s), ${errors.length} failed`
        },
        { status: 207 } // Multi-Status
      );
    }

    // All successful
    return NextResponse.json(
      isArray ? createdSchedules : createdSchedules[0],
      { status: 201 }
    );
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
