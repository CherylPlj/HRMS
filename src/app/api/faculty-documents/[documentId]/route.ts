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

  const body = await request.json();
  if (!body.SubmissionStatus) {
    return NextResponse.json({ error: 'SubmissionStatus is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('Document')
    .update({ SubmissionStatus: body.SubmissionStatus })
    .eq('DocumentID', documentId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  return NextResponse.json(data);
}
