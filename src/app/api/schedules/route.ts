import { NextRequest, NextResponse } from 'next/server';
import { prisma, handlePreparedStatementError } from '@/lib/prisma';
import { z } from 'zod';
import { timeRangesOverlap } from '@/lib/timeUtils';

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

        // Validation 1: Check if teacher has overlapping time on the same day
        // Teachers cannot have two subjects at the same time and same day
        // Get all existing schedules for this faculty on the days being processed
        const existingFacultySchedules = await handlePreparedStatementError(() =>
          prisma.schedules.findMany({
            where: {
              facultyId: validatedData.facultyId,
              day: { in: daysToProcess },
            },
            include: {
              subject: true,
            },
          })
        );

        // Check for overlapping times (not just exact matches)
        for (const day of daysToProcess) {
          const daySchedules = existingFacultySchedules.filter(s => s.day === day);
          for (const existingSchedule of daySchedules) {
            if (timeRangesOverlap(existingSchedule.time, validatedData.time)) {
              // Any overlapping time on the same day is a conflict, regardless of subject
              errors.push({ 
                index: i, 
                error: 'Schedule conflict detected',
                message: `Teacher already has ${existingSchedule.subject.name} scheduled at ${day} ${existingSchedule.time}. Cannot assign ${subject.name} at overlapping time ${validatedData.time} on the same day.`
              });
              break;
            }
          }
          if (errors.some(e => e.index === i)) break; // Exit outer loop if error found
        }

        if (errors.some(e => e.index === i)) {
          continue; // Skip to next schedule if validation failed
        }

        // Validation 2: Check if section already has a different teacher at overlapping time
        // Two teachers cannot have same/overlapping time in one section
        for (const day of daysToProcess) {
          const sectionSchedules = await handlePreparedStatementError(() =>
            prisma.schedules.findMany({
              where: {
                classSectionId: validatedData.classSectionId,
                day: day,
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
            })
          );

          for (const sectionSchedule of sectionSchedules) {
            if (timeRangesOverlap(sectionSchedule.time, validatedData.time)) {
              // If it's a different teacher, conflict (two teachers cannot be in same section at same time)
              if (sectionSchedule.facultyId !== validatedData.facultyId) {
                const otherTeacherName = `${sectionSchedule.faculty.User.FirstName} ${sectionSchedule.faculty.User.LastName}`;
                errors.push({ 
                  index: i, 
                  error: 'Schedule conflict detected',
                  message: `Section ${classSection.name} already has ${otherTeacherName} teaching ${sectionSchedule.subject.name} at ${day} ${sectionSchedule.time}. Cannot assign another teacher at overlapping time ${validatedData.time}.`
                });
                break;
              }
            }
          }
          if (errors.some(e => e.index === i)) break; // Exit outer loop if error found
        }

        if (errors.some(e => e.index === i)) {
          continue; // Skip to next schedule if validation failed
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
