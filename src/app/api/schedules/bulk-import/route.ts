import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { timeRangesOverlap } from '@/lib/timeUtils';

const scheduleItemSchema = z.object({
  // Faculty can be identified by ID, name, or email
  facultyId: z.number().int().positive().optional(),
  facultyName: z.string().optional(),
  facultyEmail: z.string().optional(),
  
  // Subject can be identified by ID or name
  subjectId: z.number().int().positive().optional(),
  subjectName: z.string().optional(),
  
  // Section can be identified by ID or name
  classSectionId: z.number().int().positive().optional(),
  sectionName: z.string().optional(),
  
  day: z.string().min(1),
  time: z.string().min(1),
  duration: z.number().int().positive(),
}).refine(
  (data) => data.facultyId || data.facultyName || data.facultyEmail,
  { message: 'Either facultyId, facultyName, or facultyEmail must be provided' }
).refine(
  (data) => data.subjectId || data.subjectName,
  { message: 'Either subjectId or subjectName must be provided' }
).refine(
  (data) => data.classSectionId || data.sectionName,
  { message: 'Either classSectionId or sectionName must be provided' }
);

const bulkImportSchema = z.array(scheduleItemSchema);

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

// POST /api/schedules/bulk-import - Bulk import schedules from CSV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    let schedules;
    try {
      schedules = bulkImportSchema.parse(body);
    } catch (error) {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Process each schedule
    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      const rowNum = i + 2; // +2 for header and 0-index

      try {
        // Resolve Faculty ID
        let facultyId: number | null = null;

        if (schedule.facultyId) {
          // Use provided ID
          facultyId = schedule.facultyId;
        } else if (schedule.facultyName) {
          // Look up by full name (split into FirstName and LastName)
          const nameParts = schedule.facultyName!.trim().split(/\s+/);

          if (nameParts.length < 2) {
            result.failed++;
            result.errors.push({
              row: rowNum,
              message: `Faculty name "${schedule.facultyName!}" must include both first and last name`,
            });
            continue;
          }

          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');

          // Try exact match first
          let user = await prisma.user.findFirst({
            where: {
              FirstName: {
                equals: firstName,
                mode: 'insensitive',
              },
              LastName: {
                equals: lastName,
                mode: 'insensitive',
              },
              Faculty: {
                isNot: null,
              },
            },
            include: {
              Faculty: true,
            },
          });

          // If no exact match, try searching all users with Faculty and matching parts
          if (!user) {
            const allUsers = await prisma.user.findMany({
              where: {
                Faculty: {
                  isNot: null,
                },
              },
              include: {
                Faculty: true,
              },
            });

            // Search for a match by combining FirstName + LastName
            user = allUsers.find(u => {
              const fullName = `${u.FirstName} ${u.LastName}`.toLowerCase();
              return fullName === schedule.facultyName!.toLowerCase();
            }) || null;
          }

          if (user?.Faculty) {
            facultyId = user.Faculty.FacultyID;
          } else {
            result.failed++;
            result.errors.push({
              row: rowNum,
              message: `Faculty with name "${schedule.facultyName!}" not found`,
            });
            continue;
          }
        } else if (schedule.facultyEmail) {
          // Look up by email
          const user = await prisma.user.findFirst({
            where: {
              Email: {
                equals: schedule.facultyEmail,
                mode: 'insensitive',
              },
            },
            include: {
              Faculty: true,
            },
          });

          if (user?.Faculty) {
            facultyId = user.Faculty.FacultyID;
          } else {
            result.failed++;
            result.errors.push({
              row: rowNum,
              message: `Faculty with email "${schedule.facultyEmail!}" not found`,
            });
            continue;
          }
        }

        // Verify faculty exists
        if (facultyId) {
          const faculty = await prisma.faculty.findUnique({
            where: { FacultyID: facultyId },
          });

          if (!faculty) {
            result.failed++;
            result.errors.push({
              row: rowNum,
              message: `Faculty ID ${facultyId} not found`,
            });
            continue;
          }
        }

        // Resolve Subject ID
        let subjectId: number | null = null;

        if (schedule.subjectId) {
          // Use provided ID
          subjectId = schedule.subjectId;
        } else if (schedule.subjectName) {
          // Look up by name
          const subject = await prisma.subject.findFirst({
            where: {
              name: {
                equals: schedule.subjectName,
                mode: 'insensitive',
              },
            },
          });

          if (subject) {
            subjectId = subject.id;
          } else {
            result.failed++;
            result.errors.push({
              row: rowNum,
              message: `Subject "${schedule.subjectName!}" not found`,
            });
            continue;
          }
        }

        // Verify subject exists
        if (subjectId) {
          const subject = await prisma.subject.findUnique({
            where: { id: subjectId },
          });

          if (!subject) {
            result.failed++;
            result.errors.push({
              row: rowNum,
              message: `Subject ID ${subjectId} not found`,
            });
            continue;
          }
        }

        // Resolve Class Section ID
        let classSectionId: number | null = null;

        if (schedule.classSectionId) {
          // Use provided ID
          classSectionId = schedule.classSectionId;
        } else if (schedule.sectionName) {
          // Look up by name
          const classSection = await prisma.classSection.findFirst({
            where: {
              name: {
                equals: schedule.sectionName,
                mode: 'insensitive',
              },
            },
          });

          if (classSection) {
            classSectionId = classSection.id;
          } else {
            result.failed++;
            result.errors.push({
              row: rowNum,
              message: `Section "${schedule.sectionName!}" not found`,
            });
            continue;
          }
        }

        // Verify class section exists
        if (classSectionId) {
          const classSection = await prisma.classSection.findUnique({
            where: { id: classSectionId },
          });

          if (!classSection) {
            result.failed++;
            result.errors.push({
              row: rowNum,
              message: `Class Section ID ${classSectionId} not found`,
            });
            continue;
          }
        }

        // Check for schedule conflicts - teachers cannot have two subjects at the same time and same day
        let hasConflict = false;
        if (facultyId) {
          const existingFacultySchedules = await prisma.schedules.findMany({
            where: {
              facultyId: facultyId,
              day: schedule.day,
            },
            include: {
              subject: true,
            },
          });

          // Check for overlapping times (not just exact matches)
          for (const existingSchedule of existingFacultySchedules) {
            if (timeRangesOverlap(existingSchedule.time, schedule.time)) {
              result.failed++;
              result.errors.push({
                row: rowNum,
                message: `Schedule conflict: Teacher already has ${existingSchedule.subject.name} scheduled at ${schedule.day} ${existingSchedule.time}. Cannot assign another subject at overlapping time ${schedule.time} on the same day.`,
              });
              hasConflict = true;
              break;
            }
          }
        }

        if (hasConflict) {
          continue; // Skip to next schedule
        }

        // Create schedule
        if (facultyId && subjectId && classSectionId) {
          await prisma.schedules.create({
            data: {
              facultyId: facultyId,
              subjectId: subjectId,
              classSectionId: classSectionId,
              day: schedule.day,
              time: schedule.time,
              duration: schedule.duration,
            },
          });

          result.success++;
        } else {
          result.failed++;
          result.errors.push({
            row: rowNum,
            message: `Failed to resolve IDs (Faculty: ${facultyId}, Subject: ${subjectId}, Section: ${classSectionId})`,
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error in bulk import:', error);
    return NextResponse.json(
      { error: 'Failed to import schedules' },
      { status: 500 }
    );
  }
}
