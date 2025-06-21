// api/schedule/[facultyId]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

interface Schedule {
  id: string;
  facultyId: number;
  subjectId: number;
  classSectionId: number;
  day: string;
  time: string;
  duration: number;
  subject?: { name: string };
  classSection?: { name: string };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ facultyId: string }> }
) {
  try {
    const { params } = context;
    const session = await auth();
    if (!session?.userId) {
      console.log('[SCHEDULE API] Unauthorized: No session userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { facultyId } = await params;
    console.log('[SCHEDULE API] facultyId param:', facultyId);
    if (!facultyId) {
      console.log('[SCHEDULE API] Missing facultyId');
      return NextResponse.json({ error: 'Faculty ID is required' }, { status: 400 });
    }

    // Fetch schedule records from the new Schedules table using Prisma
    let schedules = [];
    try {
      schedules = await prisma.schedules.findMany({
        where: {
          facultyId: parseInt(facultyId)
        },
        include: {
          subject: true,
          classSection: true
        },
        orderBy: {
          day: 'asc'
        }
      });
      console.log(`[SCHEDULE API] Prisma schedules result for facultyId ${facultyId}:`, schedules);
    } catch (prismaError) {
      console.error('[SCHEDULE API] Prisma error:', prismaError);
      throw prismaError;
    }

    // Format the response to match the expected structure
    const formattedSchedules = schedules.map((schedule) => {
      // Calculate end time based on start time and duration
      const [startHours, startMinutes] = schedule.time.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(startHours, startMinutes, 0, 0);
      const endDate = new Date(startDate.getTime() + schedule.duration * 60000);
      
      return {
        id: schedule.id.toString(),
        name: schedule.subject?.name || 'Unknown Subject',
        subject: schedule.subject?.name || 'Unknown Subject',
        classSection: schedule.classSection?.name || 'Unknown Class',
        day: schedule.day,
        timeIn: startDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        timeOut: endDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        duration: schedule.duration,
        status: 'ACTIVE',
      };
    });

    console.log(`[SCHEDULE API] Returning formatted schedules for facultyId ${facultyId}:`, formattedSchedules);
    return NextResponse.json(formattedSchedules);
  } catch (error) {
    console.error('[SCHEDULE API] Error in schedule route:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule', details: errorMessage },
      { status: 500 }
    );
  }
} 