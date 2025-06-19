import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';
import { googleDriveService } from '@/services/googleDriveService';

export async function DELETE(
  request: Request,
  { params }: { params: { documentId: string } }
) {
  const { documentId } = params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // First, get the current document to check if it has a file
    const { data: currentDoc, error: fetchError } = await supabaseAdmin
      .from('Document')
      .select('FilePath, SubmissionStatus')
      .eq('DocumentID', documentId)
      .single();

    if (fetchError) {
      console.error('Error fetching document:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
    }

    // Check if document is approved
    if (currentDoc?.SubmissionStatus === 'Approved') {
      return NextResponse.json(
        { error: 'Cannot delete an approved document' },
        { status: 403 }
      );
    }

    // If there's a file in Google Drive, delete it
    if (currentDoc?.FilePath) {
      try {
        await googleDriveService.deleteFile(currentDoc.FilePath);
        console.log('Successfully deleted file from Google Drive:', currentDoc.FilePath);
      } catch (deleteError) {
        console.error('Error deleting file from Google Drive:', deleteError);
        // Continue with update even if delete fails
      }
    }

    // Update the document record to clear all file-related fields
    const { data, error } = await supabaseAdmin
      .from('Document')
      .update({
        SubmissionStatus: 'Submitted',
        FilePath: null,
        FileUrl: null,
        DownloadUrl: null,
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
    console.error('Error in DELETE operation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 