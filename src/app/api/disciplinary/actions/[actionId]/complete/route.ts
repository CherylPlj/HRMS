import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { disciplinaryActionService } from '@/services/disciplinaryActionService';

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
    const userId = user.id;

    const action = await disciplinaryActionService.completeAction(actionId, userId);

    return NextResponse.json(action);
  } catch (error) {
    console.error('Error completing action:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete action';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

