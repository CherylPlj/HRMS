import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching schedules from database...');
    
    const schedules = await prisma.schedules.findMany({
      include: {
        subject: true,
        classSection: true,
        faculty: {
          include: {
            User: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${schedules.length} schedules`);
    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch schedules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Creating schedule:', body);
    
    const schedule = await prisma.schedules.create({
      data: {
        facultyId: body.facultyId,
        subjectId: body.subjectId,
        classSectionId: body.classSectionId,
        day: body.day,
        time: body.time,
        duration: body.duration,
      },
      include: {
        subject: true,
        classSection: true,
        faculty: {
          include: {
            User: true
          }
        }
      }
    });

    console.log('Schedule created successfully:', schedule);
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 