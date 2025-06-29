import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await params;

    const workExperience = await prisma.employmentHistory.findMany({
      where: {
        employeeId: employeeId
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    return NextResponse.json(workExperience);
  } catch (error) {
    console.error('Error fetching work experience:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work experience' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await params;
    const data = await request.json();

    // Validate required fields
    if (!data.schoolName || !data.position || !data.startDate) {
      return NextResponse.json(
        { error: 'School name, position, and start date are required fields' },
        { status: 400 }
      );
    }

    const workExperience = await prisma.employmentHistory.create({
      data: {
        employeeId: employeeId,
        schoolName: data.schoolName,
        position: data.position,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        reasonForLeaving: data.reasonForLeaving
      }
    });

    return NextResponse.json(workExperience);
  } catch (error) {
    console.error('Error creating work experience:', error);
    return NextResponse.json(
      { error: 'Failed to create work experience' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await params;
    const data = await request.json();

    // Convert date strings to Date objects
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    // Ensure numeric fields are properly typed
    if (data.salary) data.salary = parseFloat(data.salary);

    const workExperience = await prisma.employmentHistory.update({
      where: {
        id: data.id
      },
      data: {
        schoolName: data.schoolName,
        position: data.position,
        startDate: data.startDate,
        endDate: data.endDate,
        reasonForLeaving: data.reasonForLeaving  
      }
    });

    return NextResponse.json(workExperience);
  } catch (error) {
    console.error('Error updating work experience:', error);
    return NextResponse.json(
      { error: 'Failed to update work experience' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await params;
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get('id') || '');

    if (!id) {
      return NextResponse.json(
        { error: 'Work experience ID is required' },
        { status: 400 }
      );
    }

    await prisma.employmentHistory.delete({
      where: {
        id: id
      }
    });

    return NextResponse.json({ message: 'Work experience deleted successfully' });
  } catch (error) {
    console.error('Error deleting work experience:', error);
    return NextResponse.json(
      { error: 'Failed to delete work experience' },
      { status: 500 }
    );
  }
}