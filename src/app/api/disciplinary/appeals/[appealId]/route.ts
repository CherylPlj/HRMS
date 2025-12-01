import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { disciplinaryAppealService } from '@/services/disciplinaryAppealService';
import { AppealStatus } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appealId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appealId } = await params;
    const appeal = await disciplinaryAppealService.getAppealById(appealId);

    if (!appeal) {
      return NextResponse.json(
        { error: 'Appeal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(appeal);
  } catch (error) {
    console.error('Error fetching appeal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appeal' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ appealId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appealId } = await params;
    const body = await request.json();

    // If reviewing the appeal
    if (body.status && ['Pending', 'UnderReview', 'Approved', 'Rejected', 'Withdrawn'].includes(body.status)) {
      if (!body.decision) {
        return NextResponse.json(
          { error: 'Decision is required when reviewing an appeal' },
          { status: 400 }
        );
      }

      const userId = user.id;
      const appeal = await disciplinaryAppealService.reviewAppeal(appealId, {
        reviewedBy: userId,
        status: body.status as AppealStatus,
        decision: body.decision,
        decisionDate: body.decisionDate ? new Date(body.decisionDate) : undefined,
      });

      return NextResponse.json(appeal);
    }

    // If withdrawing the appeal
    if (body.withdraw === true) {
      const appeal = await disciplinaryAppealService.withdrawAppeal(appealId);
      return NextResponse.json(appeal);
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide status and decision to review, or withdraw: true to withdraw.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating appeal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update appeal';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appealId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appealId } = await params;
    await disciplinaryAppealService.deleteAppeal(appealId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting appeal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete appeal';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

