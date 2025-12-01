import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { disciplinaryService } from '@/services/disciplinaryService';

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
    const userId = user.id;

    const record = await disciplinaryService.acknowledgeDisciplinaryRecord(id, userId);

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error acknowledging disciplinary record:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to acknowledge disciplinary record';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

