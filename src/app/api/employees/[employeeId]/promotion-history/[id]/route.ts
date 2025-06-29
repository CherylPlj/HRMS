import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

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

    // Get user details from Clerk
    const user = await prisma.user.findUnique({
      where: { ClerkID: userId },
      include: { 
        Role: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has admin role - only admins can edit promotion records
    const userRoles = user.Role.map(ur => ur.role.name.toLowerCase());
    const isAdmin = userRoles.some(role => 
      role.includes('admin') || 
      role.includes('super admin') || 
      role.includes('superadmin') ||
      role === 'admin' ||
      role === 'super admin' ||
      role === 'superadmin'
    );
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can edit promotion records' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!data.toPosition || !data.effectiveDate) {
      return NextResponse.json(
        { error: 'Position and effective date are required fields' },
        { status: 400 }
      );
    }

    // If approvedBy is a Clerk ID, convert it to user name
    let approvedByDisplay = data.approvedBy;
    if (data.approvedBy && data.approvedBy.startsWith('user_')) {
      const approvedByUser = await prisma.user.findUnique({
        where: { ClerkID: data.approvedBy },
        select: { FirstName: true, LastName: true }
      });
      if (approvedByUser) {
        approvedByDisplay = `${approvedByUser.FirstName} ${approvedByUser.LastName}`.trim();
      }
    }

    const promotionRecord = await prisma.promotionHistory.update({
      where: {
        id: parseInt(id),
        employeeId: employeeId,
      },
      data: {
        ...data,
        effectiveDate: new Date(data.effectiveDate),
        updatedBy: userId,
        updatedAt: new Date(),
        approvedBy: approvedByDisplay, // Store the display name instead of Clerk ID
      },
    });

    return NextResponse.json(promotionRecord);
  } catch (error) {
    console.error('Error updating promotion record:', error);
    return NextResponse.json(
      { error: 'Failed to update promotion record' },
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

    // Get user details from Clerk
    const user = await prisma.user.findUnique({
      where: { ClerkID: userId },
      include: { 
        Role: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has admin role - only admins can delete promotion records
    const userRoles = user.Role.map(ur => ur.role.name.toLowerCase());
    const isAdmin = userRoles.some(role => 
      role.includes('admin') || 
      role.includes('super admin') || 
      role.includes('superadmin') ||
      role === 'admin' ||
      role === 'super admin' ||
      role === 'superadmin'
    );
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can delete promotion records' },
        { status: 403 }
      );
    }

    await prisma.promotionHistory.delete({
      where: {
        id: parseInt(id),
        employeeId: employeeId,
      },
    });

    return NextResponse.json({ message: 'Promotion record deleted successfully' });
  } catch (error) {
    console.error('Error deleting promotion record:', error);
    return NextResponse.json(
      { error: 'Failed to delete promotion record' },
      { status: 500 }
    );
  }
} 