import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

// GET /api/employees/[employeeId]/education
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
    
    const education = await prisma.education.findMany({
      where: {
        employeeId: employeeId,
      },
      orderBy: {
        yearGraduated: 'desc',
      },
    });

    return NextResponse.json(education);
  } catch (error) {
    console.error('Error fetching education:', error);
    return NextResponse.json(
      { error: 'Failed to fetch education records' },
      { status: 500 }
    );
  }
}

// POST /api/employees/[employeeId]/education
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

    // Exclude id field from data to avoid unique constraint errors
    const { id, ...educationData } = data;

    const education = await prisma.education.create({
      data: {
        ...educationData,
        employeeId: employeeId,
      },
    });

    return NextResponse.json(education);
  } catch (error) {
    console.error('Error creating education record:', error);
    return NextResponse.json(
      { error: 'Failed to create education record' },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[employeeId]/education/[id]
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string; id: string }> }
) {
  try {
    const { employeeId, id } = await context.params;
    const data = await request.json();
    const educationId = parseInt(id);

    const education = await prisma.education.update({
      where: {
        id: educationId,
        employeeId: employeeId,
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
  context: { params: Promise<{ employeeId: string; id: string }> }
) {
  try {
    const { employeeId, id } = await context.params;
    const educationId = parseInt(id);

    await prisma.education.delete({
      where: {
        id: educationId,
        employeeId: employeeId,
      },
    });

    return NextResponse.json({ message: 'Education record deleted successfully' });
  } catch (error) {
    console.error('Error deleting education record:', error);
    return NextResponse.json(
      { error: 'Failed to delete education record' },
      { status: 500 }
    );
  }
} 