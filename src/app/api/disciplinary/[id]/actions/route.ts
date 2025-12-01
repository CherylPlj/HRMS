import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { disciplinaryActionService } from '@/services/disciplinaryActionService';
import { DisciplinaryActionType, DisciplinaryActionStatus } from '@prisma/client';

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
    const actions = await disciplinaryActionService.getActionsByRecordId(id);

    return NextResponse.json(actions);
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actions' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    // Validate required fields
    if (!body.actionType) {
      return NextResponse.json(
        { error: 'Action type is required' },
        { status: 400 }
      );
    }

    if (!body.effectiveDate) {
      return NextResponse.json(
        { error: 'Effective date is required' },
        { status: 400 }
      );
    }

    if (!body.description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Validate action type enum
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

    // Validate status enum if provided
    if (body.status && !['Pending', 'Active', 'Completed', 'Cancelled', 'Appealed'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be Pending, Active, Completed, Cancelled, or Appealed' },
        { status: 400 }
      );
    }

    const userId = user.id;

    const action = await disciplinaryActionService.createAction({
      disciplinaryRecordId: id,
      actionType: body.actionType as DisciplinaryActionType,
      effectiveDate: new Date(body.effectiveDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      description: body.description,
      status: body.status as DisciplinaryActionStatus,
      notes: body.notes,
      createdBy: userId,
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error('Error creating action:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create action';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

