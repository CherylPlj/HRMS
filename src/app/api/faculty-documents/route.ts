import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createDocumentNotification } from '@/lib/notifications';

const prisma = new PrismaClient();

// GET /api/faculty-documents - Get all documents for a faculty member
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get('facultyId');

    if (!facultyId) {
      return NextResponse.json(
        { error: 'Faculty ID is required' },
        { status: 400 }
      );
    }

    const documents = await prisma.document.findMany({
      where: {
        FacultyID: parseInt(facultyId, 10),
      },
      include: {
        DocumentType: true,
        Faculty: {
          include: {
            User: {
              select: {
                FirstName: true,
                LastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        UploadDate: 'desc',
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/faculty-documents - Upload a new document
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const facultyId = formData.get('FacultyID');
    const documentTypeId = formData.get('DocumentTypeID');
    const file = formData.get('file') as File;

    if (!facultyId || !documentTypeId || !file) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        FacultyID: parseInt(facultyId as string, 10),
        DocumentTypeID: parseInt(documentTypeId as string, 10),
        UploadDate: new Date(),
        SubmissionStatus: 'PENDING',
      },
      include: {
        DocumentType: true,
        Faculty: {
          include: {
            User: {
              select: {
                FirstName: true,
                LastName: true,
              },
            },
          },
        },
      },
    });

    // Find admin user to send notification to
    const adminUser = await prisma.user.findFirst({
      where: {
        Role: {
          some: {
            role: {
              name: 'Admin'
            }
          }
        }
      }
    });

    if (adminUser) {
      try {
        await createDocumentNotification({
          facultyId: facultyId.toString(),
          adminId: adminUser.UserID,
          status: 'SUBMITTED'
        });
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// PATCH /api/faculty-documents/[id] - Update document status
export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();

    const document = await prisma.document.update({
      where: {
        DocumentID: id,
      },
      data: {
        SubmissionStatus: status,
      },
      include: {
        DocumentType: true,
        Faculty: {
          include: {
            User: {
              select: {
                FirstName: true,
                LastName: true,
              },
            },
          },
        },
      },
    });

    // Send notification to faculty member
    try {
      await createDocumentNotification({
        facultyId: document.FacultyID.toString(),
        adminId: '', // Not needed for status updates
        status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED'
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
} 