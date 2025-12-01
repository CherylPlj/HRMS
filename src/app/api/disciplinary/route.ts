import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { disciplinaryService } from '@/services/disciplinaryService';
import { DisciplinarySeverity, DisciplinaryStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters: any = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
    };

    const category = searchParams.get('category');
    if (category) filters.category = category;

    const severity = searchParams.get('severity');
    if (severity && severity !== 'all') {
      if (['Minor', 'Moderate', 'Major'].includes(severity)) {
        filters.severity = severity as DisciplinarySeverity;
      }
    } else if (severity === 'all') {
      filters.severity = 'all';
    }

    const status = searchParams.get('status');
    if (status && status !== 'all') {
      if (['Ongoing', 'For_Review', 'Resolved', 'Closed'].includes(status)) {
        filters.status = status as DisciplinaryStatus;
      }
    } else if (status === 'all') {
      filters.status = 'all';
    }

    const employeeId = searchParams.get('employeeId');
    if (employeeId) filters.employeeId = employeeId;

    const supervisorId = searchParams.get('supervisorId');
    if (supervisorId) filters.supervisorId = supervisorId;

    const violation = searchParams.get('violation');
    if (violation) filters.violation = violation;

    const dateFrom = searchParams.get('dateFrom');
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom);
    }

    const dateTo = searchParams.get('dateTo');
    if (dateTo) {
      filters.dateTo = new Date(dateTo);
    }

    const searchQuery = searchParams.get('search');
    if (searchQuery) filters.searchQuery = searchQuery;

    const result = await disciplinaryService.getDisciplinaryRecords(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching disciplinary records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch disciplinary records' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    if (!body.category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    if (!body.violation) {
      return NextResponse.json(
        { error: 'Violation is required' },
        { status: 400 }
      );
    }

    if (!body.severity) {
      return NextResponse.json(
        { error: 'Severity is required' },
        { status: 400 }
      );
    }

    // Validate severity enum
    if (!['Minor', 'Moderate', 'Major'].includes(body.severity)) {
      return NextResponse.json(
        { error: 'Invalid severity. Must be Minor, Moderate, or Major' },
        { status: 400 }
      );
    }

    // Validate status enum if provided
    if (body.status && !['Ongoing', 'For_Review', 'Resolved', 'Closed'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be Ongoing, For_Review, Resolved, or Closed' },
        { status: 400 }
      );
    }

    // Get user ID from Clerk
    const userId = user.id;

    // Convert supervisor EmployeeID to UserID if provided
    let supervisorUserID: string | undefined = undefined;
    if (body.supervisorId) {
      // Find the User record that has this EmployeeID
      const supervisorUser = await prisma.user.findFirst({
        where: { EmployeeID: body.supervisorId },
        select: { UserID: true },
      });
      
      if (supervisorUser) {
        supervisorUserID = supervisorUser.UserID;
      } else {
        // If no User found for this EmployeeID, log warning but don't fail
        console.warn(`No User found for EmployeeID: ${body.supervisorId}. Supervisor will not be set.`);
      }
    }

    // Create the record
    const record = await disciplinaryService.createDisciplinaryRecord({
      employeeId: body.employeeId,
      supervisorId: supervisorUserID,
      category: body.category,
      violation: body.violation,
      severity: body.severity as DisciplinarySeverity,
      status: body.status as DisciplinaryStatus,
      dateTime: body.dateTime ? new Date(body.dateTime) : undefined,
      resolution: body.resolution,
      resolutionDate: body.resolutionDate ? new Date(body.resolutionDate) : undefined,
      remarks: body.remarks,
      interviewNotes: body.interviewNotes,
      hrRemarks: body.hrRemarks,
      recommendedPenalty: body.recommendedPenalty,
      offenseCount: body.offenseCount,
      createdBy: userId,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Error creating disciplinary record:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create disciplinary record';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

