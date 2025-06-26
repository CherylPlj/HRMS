import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = params;

    const workExperiences = await prisma.employmentHistory.findMany({
      where: {
        employeeId: employeeId,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return NextResponse.json(workExperiences);
  } catch (error) {
    console.error('Error fetching work experiences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work experiences' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = params;
    const data = await request.json();

    // Validate required fields
    if (!data.schoolName || !data.position || !data.startDate) {
      return NextResponse.json(
        { error: 'School name, position, and start date are required fields' },
        { status: 400 }
      );
    }

    // Create new work experience record
    const workExperience = await prisma.employmentHistory.create({
      data: {
        ...data,
        employeeId,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    return NextResponse.json(workExperience, { status: 201 });
  } catch (error) {
    console.error('Error creating work experience:', error);
    return NextResponse.json(
      { error: 'Failed to create work experience' },
      { status: 500 }
    );
  }
}