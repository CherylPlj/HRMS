import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;

    const medicalInfo = await prisma.medicalInfo.findUnique({
      where: {
        employeeId: employeeId
      }
    });

    if (!medicalInfo) {
      return NextResponse.json(
        { error: 'Medical information not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(medicalInfo);
  } catch (error) {
    console.error('Error fetching medical info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medical information' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const data = await request.json();

    const updatedMedicalInfo = await prisma.medicalInfo.upsert({
      where: {
        employeeId: employeeId
      },
      update: data,
      create: {
        ...data,
        employeeId: employeeId
      }
    });

    return NextResponse.json(updatedMedicalInfo);
  } catch (error) {
    console.error('Error updating medical info:', error);
    return NextResponse.json(
      { error: 'Failed to update medical information' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const data = await request.json();

    const updatedMedicalInfo = await prisma.medicalInfo.update({
      where: {
        employeeId: employeeId
      },
      data: data
    });

    return NextResponse.json(updatedMedicalInfo);
  } catch (error) {
    console.error('Error updating medical info:', error);
    return NextResponse.json(
      { error: 'Failed to update medical information' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;

    await prisma.medicalInfo.delete({
      where: {
        employeeId: employeeId
      }
    });

    return NextResponse.json({ message: 'Medical information deleted successfully' });
  } catch (error) {
    console.error('Error deleting medical info:', error);
    return NextResponse.json(
      { error: 'Failed to delete medical information' },
      { status: 500 }
    );
  }
} 