import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { timeRangesOverlap } from '@/lib/timeUtils';

/**
 * POST /api/schedules/check-conflicts
 * Checks for schedule conflicts before assignment
 * 
 * Request body:
 * {
 *   facultyId: number,
 *   subjectId: number,
 *   classSectionId: number,
 *   day: string,
 *   time: string,
 *   scheduleId?: number (optional, for updates - excludes this schedule from conflict check)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { facultyId, subjectId, classSectionId, day, time, scheduleId } = body;

    if (!facultyId || !subjectId || !classSectionId || !day || !time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const conflicts: Array<{
      type: 'teacher' | 'section';
      message: string;
      conflictingSchedule: {
        id: number;
        subjectName: string;
        sectionName: string;
        teacherName: string;
        day: string;
        time: string;
      };
    }> = [];

    // Get all valid classSection IDs to filter out orphaned schedules
    const validClassSectionIds = await prisma.classSection.findMany({
      select: { id: true },
    }).then(sections => sections.map(s => s.id));

    // Verify the requested classSectionId is valid
    if (!validClassSectionIds.includes(classSectionId)) {
      return NextResponse.json(
        { error: 'Invalid class section ID' },
        { status: 400 }
      );
    }

    // Validation 1: Check if teacher has overlapping time on the same day
    const existingFacultySchedules = await prisma.schedules.findMany({
      where: {
        ...(scheduleId ? { id: { not: scheduleId } } : {}),
        facultyId: facultyId,
        day: day,
        classSectionId: { in: validClassSectionIds },
      },
      include: {
        subject: true,
        classSection: true,
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
      },
    });

    // Check for overlapping times
    for (const existingSchedule of existingFacultySchedules) {
      if (timeRangesOverlap(existingSchedule.time, time)) {
        const teacherName = `${existingSchedule.faculty.User.FirstName} ${existingSchedule.faculty.User.LastName}`;
        conflicts.push({
          type: 'teacher',
          message: `Teacher already has ${existingSchedule.subject.name} scheduled at ${day} ${existingSchedule.time}. Cannot assign at overlapping time ${time} on the same day.`,
          conflictingSchedule: {
            id: existingSchedule.id,
            subjectName: existingSchedule.subject.name,
            sectionName: existingSchedule.classSection.name,
            teacherName: teacherName,
            day: existingSchedule.day,
            time: existingSchedule.time,
          },
        });
      }
    }

    // Validation 2: Check if section already has a different teacher at overlapping time
    const sectionSchedules = await prisma.schedules.findMany({
      where: {
        ...(scheduleId ? { id: { not: scheduleId } } : {}),
        classSectionId: classSectionId,
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
        classSection: true,
      },
    });

    for (const sectionSchedule of sectionSchedules) {
      if (timeRangesOverlap(sectionSchedule.time, time)) {
        // If it's a different teacher, conflict (two teachers cannot be in same section at same time)
        if (sectionSchedule.facultyId !== facultyId) {
          const otherTeacherName = `${sectionSchedule.faculty.User.FirstName} ${sectionSchedule.faculty.User.LastName}`;
          conflicts.push({
            type: 'section',
            message: `Section ${sectionSchedule.classSection.name} already has ${otherTeacherName} teaching ${sectionSchedule.subject.name} at ${day} ${sectionSchedule.time}. Cannot assign another teacher at overlapping time ${time}.`,
            conflictingSchedule: {
              id: sectionSchedule.id,
              subjectName: sectionSchedule.subject.name,
              sectionName: sectionSchedule.classSection.name,
              teacherName: otherTeacherName,
              day: sectionSchedule.day,
              time: sectionSchedule.time,
            },
          });
        }
      }
    }

    return NextResponse.json({
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts,
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to check conflicts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
