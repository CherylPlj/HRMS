import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/utils/serverRoleUtils';

export async function PUT(
  request: NextRequest,
  { params }: { params: { employeeId: string; id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin - admins cannot edit work experience
    if (await isUserAdmin()) {
      return NextResponse.json(
        { error: 'Admins are not allowed to edit work experience' },
        { status: 403 }
      );
    }

    const { employeeId, id } = params;
    const data = await request.json();

    // Validate required fields
    if (!data.schoolName || !data.position || !data.startDate) {
      return NextResponse.json(
        { error: 'School name, position, and start date are required fields' },
        { status: 400 }
      );
    }

    // Update work experience record
    const workExperience = await prisma.employmentHistory.update({
      where: {
        id: parseInt(id),
        employeeId: employeeId,
      },
      data: {
        schoolName: data.schoolName,
        position: data.position,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        reasonForLeaving: data.reasonForLeaving,
        salary: data.salary ? parseFloat(data.salary) : null
      },
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
  { params }: { params: { employeeId: string; id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin - admins cannot delete work experience
    if (await isUserAdmin()) {
      return NextResponse.json(
        { error: 'Admins are not allowed to delete work experience' },
        { status: 403 }
      );
    }

    const { employeeId, id } = params;

    // Delete work experience record
    await prisma.employmentHistory.delete({
      where: {
        id: parseInt(id),
        employeeId: employeeId,
      },
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