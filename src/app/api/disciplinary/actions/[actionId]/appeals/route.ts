import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { disciplinaryAppealService } from '@/services/disciplinaryAppealService';

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
    const appeals = await disciplinaryAppealService.getAppealsByActionId(actionId);

    return NextResponse.json(appeals);
  } catch (error) {
    console.error('Error fetching appeals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appeals' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    // Validate required fields
    if (!body.employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    if (!body.reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    const appeal = await disciplinaryAppealService.createAppeal({
      disciplinaryActionId: actionId,
      employeeId: body.employeeId,
      reason: body.reason,
      supportingDocuments: body.supportingDocuments,
    });

    return NextResponse.json(appeal, { status: 201 });
  } catch (error) {
    console.error('Error creating appeal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create appeal';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

