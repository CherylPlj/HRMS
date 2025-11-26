import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathArray = await params.path;
    if (!pathArray || pathArray.length === 0) {
      return NextResponse.json(
        { error: 'File path is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Join the path array to get the full file path
    // This handles paths with slashes and special characters
    const filePath = pathArray.join('/');

    // Check if download parameter is set
    const { searchParams } = new URL(req.url);
    const isDownload = searchParams.get('download') === 'true';

    // Download the file from Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .download(filePath);

    if (error) {
      console.error('Error downloading file from Supabase:', error);
      return NextResponse.json(
        { error: 'File not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const fileName = filePath.split('/').pop() || 'file';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    // Determine content type based on file extension
    const contentTypeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'odt': 'application/vnd.oasis.opendocument.text',
      'rtf': 'application/rtf',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    };

    const contentType = contentTypeMap[fileExtension] || 'application/octet-stream';

    // Convert blob to array buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Set Content-Disposition based on whether it's a download or preview
    const contentDisposition = isDownload 
      ? `attachment; filename="${encodeURIComponent(fileName)}"`
      : `inline; filename="${encodeURIComponent(fileName)}"`;

    // Return the file with appropriate Content-Disposition
    // Also set headers to allow iframe embedding and CORS
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

