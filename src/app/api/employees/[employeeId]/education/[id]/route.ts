import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/employees/[employeeId]/education/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string; id: string } }
) {
  try {
    const education = await prisma.education.findUnique({
      where: {
        id: parseInt(params.id),
        employeeId: params.employeeId,
      },
    });

    if (!education) {
      return NextResponse.json(
        { error: 'Education record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(education);
  } catch (error) {
    console.error('Error fetching education record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch education record' },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[employeeId]/education/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { employeeId: string; id: string } }
) {
  try {
    const data = await request.json();
    const education = await prisma.education.update({
      where: {
        id: parseInt(params.id),
        employeeId: params.employeeId,
      },
      data,
    });

    return NextResponse.json(education);
  } catch (error) {
    console.error('Error updating education record:', error);
    return NextResponse.json(
      { error: 'Failed to update education record' },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[employeeId]/education/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { employeeId: string; id: string } }
) {
  try {
    await prisma.education.delete({
      where: {
        id: parseInt(params.id),
        employeeId: params.employeeId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting education record:', error);
    return NextResponse.json(
      { error: 'Failed to delete education record' },
      { status: 500 }
    );
  }
} 