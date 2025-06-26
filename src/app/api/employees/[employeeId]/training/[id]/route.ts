import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { employeeId: string; id: string } }
) {
  try {
    const data = await request.json();
    const id = parseInt(params.id);

    const training = await prisma.training.update({
      where: {
        id,
        employeeId: params.employeeId,
      },
      data,
    });

    return NextResponse.json(training);
  } catch (error) {
    console.error('Error updating training:', error);
    return NextResponse.json(
      { error: 'Failed to update training' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { employeeId: string; id: string } }
) {
  try {
    const id = parseInt(params.id);

    await prisma.training.delete({
      where: {
        id,
        employeeId: params.employeeId,
      },
    });

    return NextResponse.json({ message: 'Training deleted successfully' });
  } catch (error) {
    console.error('Error deleting training:', error);
    return NextResponse.json(
      { error: 'Failed to delete training' },
      { status: 500 }
    );
  }
} 