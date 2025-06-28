import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getUserRoleFlexible } from '@/lib/getUserRoleFlexible';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await context.params;

    // Get user role and check authorization
    const userRole = await getUserRoleFlexible(userId);
    if (!userRole || (!userRole.includes('ADMIN') && !userRole.includes('FACULTY') && userId !== employeeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const familyRecords = await prisma.family.findMany({
      where: {
        employeeId: employeeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(familyRecords);
  } catch (error) {
    console.error('Error fetching family records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch family records' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await context.params;
    const data = await request.json();

    // Validate required fields
    if (!data.type || !data.name) {
      return NextResponse.json(
        { error: 'Type and name are required fields' },
        { status: 400 }
      );
    }

    // Create new family record
    const familyRecord = await prisma.family.create({
      data: {
        ...data,
        employeeId,
      },
    });

    return NextResponse.json(familyRecord, { status: 201 });
  } catch (error) {
    console.error('Error creating family record:', error);
    return NextResponse.json(
      { error: 'Failed to create family record' },
      { status: 500 }
    );
  }
} 