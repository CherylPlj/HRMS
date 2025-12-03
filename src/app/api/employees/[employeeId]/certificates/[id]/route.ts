import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { auth } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/utils/serverRoleUtils';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string; id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin - admins cannot edit certificates
    if (await isUserAdmin()) {
      return NextResponse.json(
        { error: 'Admins are not allowed to edit certificates' },
        { status: 403 }
      );
    }

    const { employeeId, id } = await context.params;
    const formData = await request.formData();
    const fileData = formData.get('file') as File | null;
    const jsonData = formData.get('data') as string;
    const data = JSON.parse(jsonData);
    const certificateId = parseInt(id);

    let fileUrl = data.fileUrl;
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

    const certificate = await prisma.certificate.update({
      where: {
        id: certificateId,
        employeeId: employeeId,
      },
      data: {
        title: data.title,
        issuedBy: data.issuedBy,
        issueDate: new Date(data.issueDate),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        description: data.description,
        fileUrl,
      },
    });

    console.log('Certificate updated successfully:', certificate);
    return NextResponse.json(certificate);
  } catch (error) {
    console.error('Error updating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to update certificate' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string; id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin - admins cannot delete certificates
    if (await isUserAdmin()) {
      return NextResponse.json(
        { error: 'Admins are not allowed to delete certificates' },
        { status: 403 }
      );
    }

    const { employeeId, id } = await context.params;
    const certificateId = parseInt(id);

    // Get the certificate to check if it has a file
    const certificate = await prisma.certificate.findUnique({
      where: {
        id: certificateId,
        employeeId: employeeId,
      },
    });

    if (certificate?.fileUrl) {
      try {
        // Extract the file path from the Supabase URL
        const url = new URL(certificate.fileUrl);
        const filePath = url.pathname.split('/').pop(); // Get the filename
        
        if (filePath) {
          // Delete the file from Supabase Storage
          const { error: deleteError } = await supabaseAdmin.storage
            .from('certificates')
            .remove([filePath]);
          
          if (deleteError) {
            console.error('Error deleting certificate file from Supabase:', deleteError);
          } else {
            console.log('Certificate file deleted from Supabase:', filePath);
          }
        }
      } catch (deleteError) {
        console.error('Error deleting certificate file:', deleteError);
        // Continue with certificate deletion even if file deletion fails
      }
    }

    await prisma.certificate.delete({
      where: {
        id: certificateId,
        employeeId: employeeId,
      },
    });

    console.log('Certificate deleted successfully');
    return NextResponse.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    return NextResponse.json(
      { error: 'Failed to delete certificate' },
      { status: 500 }
    );
  }
} 