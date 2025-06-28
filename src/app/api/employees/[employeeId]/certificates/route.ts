import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      // Handle file upload to your storage service (e.g., Supabase Storage)
      // Add the file URL to the data
      fileUrl = 'URL_TO_UPLOADED_FILE';
    }

    const certificate = await prisma.certificate.create({
      data: {
        ...data,
        employeeId: employeeId,
        fileUrl,
      },
    });

    return NextResponse.json(certificate);
  } catch (error) {
    console.error('Error creating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to create certificate' },
      { status: 500 }
    );
  }
} 