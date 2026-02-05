import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';
import { facultyDocumentService } from '@/services/facultyDocumentService';

/**
 * GET /api/faculty-documents/[documentId]/preview
 * Streams the document file with Content-Disposition: inline so it can be
 * displayed in an iframe (fixes blank PDF preview when loading from Google Drive directly).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await params;
    const docId = parseInt(documentId, 10);
    if (isNaN(docId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const { data: doc, error } = await supabaseAdmin
      .from('Document')
      .select('DocumentID, FacultyID, FilePath, FileUrl')
      .eq('DocumentID', docId)
      .single();

    if (error || !doc?.FilePath) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Determine storage type from FileUrl (Drive vs Supabase)
    const storageType = doc.FileUrl?.includes('drive.google.com')
      ? 'google-drive'
      : 'supabase';

    const { buffer, mimeType, fileName } = await facultyDocumentService.getFileContent(
      doc.FilePath,
      storageType
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('Error serving faculty document preview:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load preview' },
      { status: 500 }
    );
  }
}
