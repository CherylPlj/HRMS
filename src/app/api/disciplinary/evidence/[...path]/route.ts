import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const EVIDENCE_BUCKET = 'disciplinary-evidence';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathArray = resolvedParams.path;
    const filePath = pathArray.join('/');

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Check if download parameter is set
    const searchParams = req.nextUrl.searchParams;
    const isDownload = searchParams.get('download') === 'true';

    // Download file from Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(EVIDENCE_BUCKET)
      .download(filePath);

    if (error) {
      console.error('Error downloading file from Supabase:', error);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type from file extension
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    const contentTypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      rtf: 'application/rtf',
    };

    const contentType = contentTypeMap[extension] || 'application/octet-stream';

    // Set headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', buffer.length.toString());

    if (isDownload) {
      // Force download
      const fileName = filePath.split('/').pop() || 'file';
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    } else {
      // Display inline (for images, PDFs, etc.)
      headers.set('Content-Disposition', 'inline');
    }

    // Set CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error serving evidence file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}

