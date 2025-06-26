import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { employeeId: string; id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId, id } = params;
    const data = await request.json();

    // Validate required fields
    if (!data.type || !data.name) {
      return NextResponse.json(
        { error: 'Type and name are required fields' },
        { status: 400 }
      );
    }

    // Update family record
    const familyRecord = await prisma.family.update({
      where: {
        id: parseInt(id),
        employeeId: employeeId,
      },
      data,
    });

    return NextResponse.json(familyRecord);
  } catch (error) {
    console.error('Error updating family record:', error);
    return NextResponse.json(
      { error: 'Failed to update family record' },
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

    const { employeeId, id } = params;

    // Delete family record
    await prisma.family.delete({
      where: {
        id: parseInt(id),
        employeeId: employeeId,
      },
    });

    return NextResponse.json({ message: 'Family record deleted successfully' });
  } catch (error) {
    console.error('Error deleting family record:', error);
    return NextResponse.json(
      { error: 'Failed to delete family record' },
      { status: 500 }
    );
  }
} 