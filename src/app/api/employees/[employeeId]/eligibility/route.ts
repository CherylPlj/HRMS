import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/employees/[employeeId]/eligibility
export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const eligibility = await prisma.eligibility.findMany({
      where: {
        employeeId: params.employeeId,
      },
      orderBy: {
        examDate: 'desc',
      },
    });

    return NextResponse.json(eligibility);
  } catch (error) {
    console.error('Error fetching eligibility records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eligibility records' },
      { status: 500 }
    );
  }
}

// POST /api/employees/[employeeId]/eligibility
export async function POST(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const data = await request.json();
    const eligibility = await prisma.eligibility.create({
      data: {
        ...data,
        employeeId: params.employeeId,
      },
    });

    return NextResponse.json(eligibility);
  } catch (error) {
    console.error('Error creating eligibility record:', error);
    return NextResponse.json(
      { error: 'Failed to create eligibility record' },
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