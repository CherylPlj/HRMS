import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

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

    // Check if this employee record belongs to the current user (by email)
    let employeeRecord = null;
    if (user.Email) {
      employeeRecord = await prisma.employee.findFirst({
        where: { 
          Email: user.Email 
        }
      });
    }

    // Check if user has admin role - comprehensive check
    const userRoles = user.Role.map(ur => ur.role.name.toLowerCase());
    console.log('User roles:', userRoles); // Debug log
    
    // More comprehensive admin check
    const isAdmin = userRoles.some(role => 
      role.includes('admin') || 
      role.includes('super admin') || 
      role.includes('superadmin') ||
      role === 'admin' ||
      role === 'super admin' ||
      role === 'superadmin'
    );
    
    console.log('Is admin?', isAdmin); // Debug log
    
    // Allow access if user is admin OR if this employee record matches their email
    const isOwnRecord = employeeRecord?.EmployeeID === employeeId;
    console.log('Is own record?', isOwnRecord); // Debug log
    console.log('Employee record ID:', employeeRecord?.EmployeeID); // Debug log
    console.log('Requested employee ID:', employeeId); // Debug log
    
    if (!isAdmin && !isOwnRecord) {
      return NextResponse.json(
        { error: `Forbidden: You can only access your own promotion history. Found EmployeeID: ${employeeRecord?.EmployeeID}, Requested: ${employeeId}` },
        { status: 403 }
      );
    }

    const promotionRecords = await prisma.promotionHistory.findMany({
      where: {
        employeeId: employeeId,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    // Enhance records with user information
    const enhancedRecords = await Promise.all(
      promotionRecords.map(async (record) => {
        let createdByUser = null;
        let approvedByUser = null;

        // Get created by user info
        if (record.createdBy) {
          createdByUser = await prisma.user.findUnique({
            where: { ClerkID: record.createdBy },
            select: { FirstName: true, LastName: true }
          });
        }

        // Get approved by user info (if it's a Clerk ID)
        if (record.approvedBy && record.approvedBy.startsWith('user_')) {
          approvedByUser = await prisma.user.findUnique({
            where: { ClerkID: record.approvedBy },
            select: { FirstName: true, LastName: true }
          });
        }

        return {
          ...record,
          createdByDisplay: createdByUser 
            ? `${createdByUser.FirstName} ${createdByUser.LastName}`.trim()
            : record.createdBy,
          approvedByDisplay: approvedByUser 
            ? `${approvedByUser.FirstName} ${approvedByUser.LastName}`.trim()
            : record.approvedBy
        };
      })
    );

    return NextResponse.json(enhancedRecords);
  } catch (error) {
    console.error('Error fetching promotion history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promotion history' },
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

    // Check if user has admin role - only admins can add promotion records
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
        { error: 'Forbidden: Only administrators can add promotion records' },
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

    const promotionRecord = await prisma.promotionHistory.create({
      data: {
        ...data,
        employeeId,
        effectiveDate: new Date(data.effectiveDate),
        createdBy: userId,
        approvedBy: approvedByDisplay, // Store the display name instead of Clerk ID
      },
    });

    return NextResponse.json(promotionRecord);
  } catch (error) {
    console.error('Error adding promotion record:', error);
    return NextResponse.json(
      { error: 'Failed to add promotion record' },
      { status: 500 }
    );
  }
} 