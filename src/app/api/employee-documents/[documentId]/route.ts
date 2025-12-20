import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

// Helper function to sanitize integer values (handles undefined, null, empty strings, and string "undefined")
function sanitizeInteger(value: any): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value === 'string' && (value === 'undefined' || value === 'null')) {
    return null;
  }
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

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

export async function PATCH(
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
    const body = await request.json();
    const { SubmissionStatus } = body;

    if (!SubmissionStatus || !['Submitted', 'Approved', 'Returned'].includes(SubmissionStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be Submitted, Approved, or Returned' },
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

    // Build update object - only include fields that are provided
    const updateData: any = {
      LastModifiedBy: user.id,
      LastModifiedDate: new Date().toISOString()
    };

    // Only update DocumentTypeID if provided and valid
    if (data.DocumentTypeID !== undefined) {
      const sanitized = sanitizeInteger(data.DocumentTypeID);
      if (sanitized === null) {
        return NextResponse.json(
          { error: 'Invalid DocumentTypeID: must be a valid integer' },
          { status: 400 }
        );
      }
      updateData.DocumentTypeID = sanitized;
    }

    // Only update Status if provided
    if (data.Status !== undefined) {
      updateData.Status = data.Status;
    }

    // Only update Notes if provided
    if (data.Notes !== undefined) {
      updateData.Notes = data.Notes;
    }

    // Update document in Supabase
    const { data: updatedDocument, error } = await supabaseAdmin
      .from('Document')
      .update(updateData)
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