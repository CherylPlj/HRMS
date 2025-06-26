import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const trainings = await prisma.training.findMany({
      where: {
        employeeId: params.employeeId,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(trainings);
  } catch (error) {
    console.error('Error fetching trainings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainings' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const data = await request.json();

    const training = await prisma.training.create({
      data: {
        ...data,
        employeeId: params.employeeId,
      },
    });

    return NextResponse.json(training);
  } catch (error) {
    console.error('Error creating training:', error);
    return NextResponse.json(
      { error: 'Failed to create training' },
      { status: 500 }
    );
  }
} 