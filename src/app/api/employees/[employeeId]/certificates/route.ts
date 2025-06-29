import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;
    
    const certificates = await prisma.certificate.findMany({
      where: {
        employeeId: employeeId,
      },
      orderBy: {
        issueDate: 'desc',
      },
    });

    return NextResponse.json(certificates);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;
    const formData = await request.formData();
    const fileData = formData.get('file') as File | null;
    const jsonData = formData.get('data') as string;
    const data = JSON.parse(jsonData);

    let fileUrl = null;
    if (fileData) {
      try {
        // Create a unique filename
        const timestamp = Date.now();
        const fileExt = fileData.name.split('.').pop();
        const fileName = `certificates/${employeeId}/certificate_${timestamp}.${fileExt}`;

        // Convert file to buffer
        const bytes = await fileData.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('certificates')
          .upload(fileName, buffer, {
            contentType: fileData.type,
            upsert: false
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          return NextResponse.json(
            { error: 'Failed to upload certificate file to cloud storage' },
            { status: 500 }
          );
        }

        // Get the public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('certificates')
          .getPublicUrl(fileName);

        fileUrl = urlData.publicUrl;
        console.log('Certificate file uploaded to Supabase successfully:', fileUrl);
      } catch (uploadError) {
        console.error('Error uploading certificate file:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload certificate file' },
          { status: 500 }
        );
      }
    }

    const certificate = await prisma.certificate.create({
      data: {
        employeeId: employeeId,
        title: data.title,
        issuedBy: data.issuedBy,
        issueDate: new Date(data.issueDate),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        description: data.description,
        fileUrl,
      },
    });

    console.log('Certificate created successfully:', certificate);
    return NextResponse.json(certificate);
  } catch (error) {
    console.error('Error creating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to create certificate' },
      { status: 500 }
    );
  }
} 