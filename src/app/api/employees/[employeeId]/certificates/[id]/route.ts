import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string; id: string }> }
) {
  try {
    const { employeeId, id } = await context.params;
    const formData = await request.formData();
    const fileData = formData.get('file') as File | null;
    const jsonData = formData.get('data') as string;
    const data = JSON.parse(jsonData);
    const certificateId = parseInt(id);

    let fileUrl = data.fileUrl;
    if (fileData) {
      // Handle file upload to your storage service (e.g., Supabase Storage)
      // Update the file URL
      fileUrl = 'URL_TO_UPLOADED_FILE';
    }

    const certificate = await prisma.certificate.update({
      where: {
        id: certificateId,
        employeeId: employeeId,
      },
      data: {
        ...data,
        fileUrl,
      },
    });

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
      // Delete the file from storage if it exists
      // Implement file deletion logic here
    }

    await prisma.certificate.delete({
      where: {
        id: certificateId,
        employeeId: employeeId,
      },
    });

    return NextResponse.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    return NextResponse.json(
      { error: 'Failed to delete certificate' },
      { status: 500 }
    );
  }
} 