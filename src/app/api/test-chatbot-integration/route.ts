import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test endpoint to verify chatbot integration
export async function GET() {
  try {
    // Test fetching queries
    const queries = await prisma.aIChat.findMany({
      take: 5,
      include: {
        User: {
          select: {
            FirstName: true,
            LastName: true,
          },
        },
      },
      orderBy: {
        dateSubmitted: 'desc',
      },
    });

    // Test fetching training documents
    const trainingDocs = await prisma.trainingDocument.findMany({
      take: 5,
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Chatbot integration test successful',
      data: {
        queriesCount: queries.length,
        trainingDocsCount: trainingDocs.length,
        sampleQueries: queries.map(q => ({
          id: q.ChatID,
          question: q.Question,
          answer: q.Answer,
          status: q.Status,
          createdBy: `${q.User.FirstName} ${q.User.LastName}`,
        })),
        sampleTrainingDocs: trainingDocs.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content.substring(0, 100) + '...',
          status: doc.status,
        })),
      },
    });
  } catch (error) {
    console.error('Chatbot integration test failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Chatbot integration test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 