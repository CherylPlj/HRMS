import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { disciplinaryActionService } from '@/services/disciplinaryActionService';
import { DisciplinaryActionType, DisciplinaryActionStatus } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionId } = await params;
    const action = await disciplinaryActionService.getActionById(actionId);

    if (!action) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(action);
  } catch (error) {
    console.error('Error fetching action:', error);
    return NextResponse.json(
      { error: 'Failed to fetch action' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionId } = await params;
    const body = await request.json();

    // Validate action type enum if provided
    if (body.actionType) {
      const validActionTypes = [
        'VerbalWarning',
        'WrittenWarning',
        'FinalWarning',
        'Suspension',
        'Demotion',
        'SalaryReduction',
        'Termination',
        'Probation',
        'Training',
        'Counseling',
        'Other',
      ];

      if (!validActionTypes.includes(body.actionType)) {
        return NextResponse.json(
          { error: `Invalid action type. Must be one of: ${validActionTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate status enum if provided
    if (body.status && !['Pending', 'Active', 'Completed', 'Cancelled', 'Appealed'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be Pending, Active, Completed, Cancelled, or Appealed' },
        { status: 400 }
      );
    }

    const userId = user.id;

    const action = await disciplinaryActionService.updateAction(actionId, {
      actionType: body.actionType as DisciplinaryActionType,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      description: body.description,
      status: body.status as DisciplinaryActionStatus,
      notes: body.notes,
      updatedBy: userId,
    });

    return NextResponse.json(action);
  } catch (error) {
    console.error('Error updating action:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update action';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionId } = await params;
    await disciplinaryActionService.deleteAction(actionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting action:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete action';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

