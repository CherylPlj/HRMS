import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// PATCH: Update a document type
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body;
  try {
    body = await request.json();
    console.log('PATCH /api/document-types/[id] called with:', { id, body });
  } catch (parseError) {
    console.error('Failed to parse request body:', parseError);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { DocumentTypeName } = body;

  if (!DocumentTypeName) {
    console.warn('DocumentTypeName missing in PATCH request');
    return NextResponse.json({ error: 'Document type name is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('DocumentType')
    .update({ DocumentTypeName })
    .eq('DocumentTypeID', id)
    .select()
    .single();

  console.log('Supabase PATCH result:', { data, error });

  if (error) {
    console.error('Supabase PATCH error:', error);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE: Delete a document type
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  // Check if any documents reference this document type
  const { data: referencingDocs, error: refError } = await supabaseAdmin
    .from('Document')
    .select('DocumentID')
    .eq('DocumentTypeID', id)
    .limit(1);

  if (refError) {
    console.error('Error checking referencing documents:', refError);
    return NextResponse.json({ error: 'Failed to check referencing documents.' }, { status: 500 });
  }

  if (referencingDocs && referencingDocs.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete: There are documents referencing this document type.' },
      { status: 400 }
    );
  }

  // Proceed with delete if no references
  const { error } = await supabaseAdmin
    .from('DocumentType')
    .delete()
    .eq('DocumentTypeID', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
