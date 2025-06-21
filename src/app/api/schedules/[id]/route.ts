import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    console.log('Updating schedule:', params.id, body);
    
    const schedule = await prisma.schedules.update({
      where: { id: parseInt(params.id) },
      data: {
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

    console.log('Schedule updated successfully:', schedule);
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Deleting schedule:', params.id);
    
    await prisma.schedules.delete({
      where: { id: parseInt(params.id) }
    });

    console.log('Schedule deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 