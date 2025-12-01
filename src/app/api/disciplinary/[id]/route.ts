import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { disciplinaryService } from '@/services/disciplinaryService';
import { DisciplinarySeverity, DisciplinaryStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const record = await disciplinaryService.getDisciplinaryRecordById(id);

    if (!record) {
      return NextResponse.json(
        { error: 'Disciplinary record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error fetching disciplinary record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch disciplinary record' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate severity enum if provided
    if (body.severity && !['Minor', 'Moderate', 'Major'].includes(body.severity)) {
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

    const record = await disciplinaryService.updateDisciplinaryRecord(id, {
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
      updatedBy: userId,
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error updating disciplinary record:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update disciplinary record';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await disciplinaryService.deleteDisciplinaryRecord(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting disciplinary record:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete disciplinary record';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

