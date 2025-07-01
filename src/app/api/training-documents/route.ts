import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET all training documents
export async function GET() {
  try {
    const documents = await prisma.trainingDocument.findMany({
      include: {
        User: {
          select: {
            FirstName: true,
            LastName: true,
          },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      uploadedBy: `${doc.User.FirstName} ${doc.User.LastName}`,
      uploadedAt: doc.uploadedAt.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }),
      status: doc.status,
    }));

    return NextResponse.json(formattedDocuments);
  } catch (error) {
    console.error('Error fetching training documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training documents' },
      { status: 500 }
    );
  }
}

// POST new training document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, fileUrl, fileType, userId } = body;

    if (!title || !content || !userId) {
      return NextResponse.json(
        { error: 'Title, content, and userId are required' },
        { status: 400 }
      );
    }

    const newDocument = await prisma.trainingDocument.create({
      data: {
        title,
        content,
        fileUrl: fileUrl || null,
        fileType: fileType || 'text',
        uploadedBy: userId, // This should be the user's name
        UserID: userId,
        status: 'Active',
      },
      include: {
        User: {
          select: {
            FirstName: true,
            LastName: true,
          },
        },
      },
    });

    const formattedDocument = {
      id: newDocument.id,
      title: newDocument.title,
      content: newDocument.content,
      fileUrl: newDocument.fileUrl,
      fileType: newDocument.fileType,
      uploadedBy: `${newDocument.User.FirstName} ${newDocument.User.LastName}`,
      uploadedAt: newDocument.uploadedAt.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }),
      status: newDocument.status,
    };

    return NextResponse.json(formattedDocument, { status: 201 });
  } catch (error) {
    console.error('Error creating training document:', error);
    return NextResponse.json(
      { error: 'Failed to create training document' },
      { status: 500 }
    );
  }
} 