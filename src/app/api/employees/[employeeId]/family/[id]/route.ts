import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string; id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId, id } = await context.params;
    const data = await request.json();
    const familyId = parseInt(id);

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
        id: familyId,
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
  context: { params: Promise<{ employeeId: string; id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId, id } = await context.params;
    const familyId = parseInt(id);

    // Delete family record
    await prisma.family.delete({
      where: {
        id: familyId,
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