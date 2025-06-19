// app/api/faculty-documents/[documentId]/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

export async function PATCH(
  request: Request,
  { params }: { params: { documentId: string } }
) {
  const { documentId } = params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { SubmissionStatus } = body;

    if (!SubmissionStatus || !['Submitted', 'Approved', 'Rejected'].includes(SubmissionStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be Submitted, Approved, or Rejected' },
        { status: 400 }
      );
    }

    // Update the document status
    const { data, error } = await supabaseAdmin
      .from('Document')
      .update({
        SubmissionStatus,
        UploadDate: new Date().toISOString()
      })
      .eq('DocumentID', documentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PATCH operation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
