import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  context: { params: { documentId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { params } = context;
    const documentId = parseInt((await params).documentId);

    // Get document from Supabase
    const { data: document, error } = await supabaseAdmin
      .from('Document')
      .select(`
        *,
        Employee:EmployeeID (
          EmployeeID,
          User:UserID (
            FirstName,
            LastName
          )
        ),
        DocumentType:DocumentTypeID (
          DocumentTypeName,
          Description
        )
      `)
      .eq('DocumentID', documentId)
      .single();

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: { documentId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { params } = context;
    const documentId = parseInt((await params).documentId);
    const data = await request.json();

    // Update document in Supabase
    const { data: updatedDocument, error } = await supabaseAdmin
      .from('Document')
      .update({
        DocumentTypeID: data.DocumentTypeID,
        Status: data.Status,
        Notes: data.Notes,
        LastModifiedBy: user.id,
        LastModifiedDate: new Date().toISOString()
      })
      .eq('DocumentID', documentId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { documentId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { params } = context;
    const documentId = parseInt((await params).documentId);

    // Delete document from Supabase
    const { error } = await supabaseAdmin
      .from('Document')
      .delete()
      .eq('DocumentID', documentId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
} 