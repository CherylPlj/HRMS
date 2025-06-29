import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await context.params;

    // Check if this employee record belongs to the current user
    const employee = await prisma.employee.findUnique({
      where: { EmployeeID: employeeId },
      select: { UserID: true }
    });
    
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Allow access if user is viewing their own record
    if (employee.UserID !== user.id) {
      // Check if user has admin role
      const userRole = user.publicMetadata?.role?.toString().toLowerCase();
      if (!userRole?.includes('admin')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
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
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await context.params;
    const data = await request.json();

    // Check if this employee record belongs to the current user
    const employee = await prisma.employee.findUnique({
      where: { EmployeeID: employeeId },
      select: { UserID: true }
    });
    
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Allow access if user is adding to their own record
    if (employee.UserID !== user.id) {
      // Check if user has admin role
      const userRole = user.publicMetadata?.role?.toString().toLowerCase();
      if (!userRole?.includes('admin')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Validate required fields
    if (!data.type || !data.name) {
      return NextResponse.json(
        { error: 'Type and name are required fields' },
        { status: 400 }
      );
    }

    // Create new family record
    // Exclude id field from data to avoid unique constraint errors
    const { id, ...familyData } = data;
    
    const familyRecord = await prisma.family.create({
      data: {
        ...familyData,
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