import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { performanceService } from '@/services/performanceService';
import { PerformanceGoalStatus } from '@prisma/client';
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
    const goal = await performanceService.getPerformanceGoalById(id);

    if (!goal) {
      return NextResponse.json(
        { error: 'Performance goal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error fetching performance goal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch performance goal';
    return NextResponse.json(
      { error: errorMessage },
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

    // Validate status enum if provided
    if (body.status && !['NotStarted', 'InProgress', 'OnTrack', 'AtRisk', 'Completed', 'Cancelled'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be NotStarted, InProgress, OnTrack, AtRisk, Completed, or Cancelled' },
        { status: 400 }
      );
    }

    // Validate progress (0-100) if provided
    if (body.progress !== undefined && (body.progress < 0 || body.progress > 100)) {
      return NextResponse.json(
        { error: 'Progress must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Verify performance review exists if provided
    if (body.performanceReviewId) {
      const review = await prisma.performanceReview.findUnique({
        where: { id: body.performanceReviewId },
        select: { id: true },
      });

      if (!review) {
        return NextResponse.json(
          { error: 'Performance review not found' },
          { status: 404 }
        );
      }
    }

    // Get user ID from Clerk
    const userId = user.id;

    // Update the goal
    const goal = await performanceService.updatePerformanceGoal(id, {
      performanceReviewId: body.performanceReviewId,
      title: body.title,
      description: body.description,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
      status: body.status ? (body.status as PerformanceGoalStatus) : undefined,
      progress: body.progress,
      completionDate: body.completionDate ? new Date(body.completionDate) : undefined,
      notes: body.notes,
      updatedBy: userId,
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error updating performance goal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update performance goal';
    
    // Handle not found error
    if (errorMessage.includes('not found') || errorMessage.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Performance goal not found' },
        { status: 404 }
      );
    }

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

    // Check if goal exists
    const goal = await performanceService.getPerformanceGoalById(id);
    if (!goal) {
      return NextResponse.json(
        { error: 'Performance goal not found' },
        { status: 404 }
      );
    }

    await performanceService.deletePerformanceGoal(id);

    return NextResponse.json({ message: 'Performance goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting performance goal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete performance goal';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

