import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { disciplinaryEvidenceService } from '@/services/disciplinaryEvidenceService';

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
    const evidence = await disciplinaryEvidenceService.getEvidenceByRecordId(id);

    return NextResponse.json(evidence);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evidence' },
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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const userId = user.id;

    // Upload file and create evidence record
    const evidence = await disciplinaryEvidenceService.uploadAndCreateEvidence(
      file,
      file.name,
      file.type,
      id,
      description || undefined,
      userId
    );

    return NextResponse.json(evidence, { status: 201 });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload evidence';
    
    // Handle specific errors
    if (errorMessage.includes('EVIDENCE_BUCKET_NOT_FOUND')) {
      return NextResponse.json(
        { error: 'Evidence storage bucket not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

