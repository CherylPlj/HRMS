import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/employees/[employeeId]/eligibility/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string; id: string } }
) {
  try {
    const eligibility = await prisma.eligibility.findUnique({
      where: {
        id: parseInt(params.id),
        employeeId: params.employeeId,
      },
    });

    if (!eligibility) {
      return NextResponse.json(
        { error: 'Eligibility record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(eligibility);
  } catch (error) {
    console.error('Error fetching eligibility record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eligibility record' },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[employeeId]/eligibility/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { employeeId: string; id: string } }
) {
  try {
    const data = await request.json();
    const eligibility = await prisma.eligibility.update({
      where: {
        id: parseInt(params.id),
        employeeId: params.employeeId,
      },
      data,
    });

    return NextResponse.json(eligibility);
  } catch (error) {
    console.error('Error updating eligibility record:', error);
    return NextResponse.json(
      { error: 'Failed to update eligibility record' },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[employeeId]/eligibility/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { employeeId: string; id: string } }
) {
  try {
    await prisma.eligibility.delete({
      where: {
        id: parseInt(params.id),
        employeeId: params.employeeId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting eligibility record:', error);
    return NextResponse.json(
      { error: 'Failed to delete eligibility record' },
      { status: 500 }
    );
  }
} 