import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { disciplinaryEvidenceService } from '@/services/disciplinaryEvidenceService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ evidenceId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evidenceId } = await params;
    const evidence = await disciplinaryEvidenceService.getEvidenceById(evidenceId);

    if (!evidence) {
      return NextResponse.json(
        { error: 'Evidence not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(evidence);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evidence' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ evidenceId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evidenceId } = await params;
    await disciplinaryEvidenceService.deleteEvidence(evidenceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete evidence';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

