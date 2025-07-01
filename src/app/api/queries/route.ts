import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET all queries
export async function GET() {
  try {
    const queries = await prisma.aIChat.findMany({
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

    // Fetch training documents for each query
    const formattedQueries = await Promise.all(queries.map(async (query) => {
      // Find associated training document
      const trainingDoc = await prisma.trainingDocument.findFirst({
        where: {
          UserID: query.UserID,
          status: 'Active'
        },
        orderBy: {
          uploadedAt: 'desc'
        }
      });

      return {
        id: query.ChatID,
        createdBy: `${query.User.FirstName} ${query.User.LastName}`,
        question: query.Question,
        answer: query.Answer,
        date: query.dateSubmitted.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
        trainingDoc: trainingDoc?.fileUrl || null,
        trainingDocTitle: trainingDoc?.title || null,
      };
    }));

    return NextResponse.json(formattedQueries);
  } catch (error) {
    console.error('Error fetching queries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queries' },
      { status: 500 }
    );
  }
}

// POST new query
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer, userId, trainingDoc, trainingDocContent } = body;

    // Debug logging
    console.log('Received request body:', {
      question,
      answer,
      userId,
      trainingDoc,
      hasTrainingDocContent: !!trainingDocContent
    });

    // Validation logic:
    // 1. userId is always required
    // 2. If trainingDoc is provided, question and answer can be empty or 'none'
    // 3. If no trainingDoc, BOTH question AND answer must be provided
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if we have a training document
    const hasTrainingDoc = trainingDoc && trainingDoc !== 'none' && trainingDoc !== null && trainingDoc.trim() !== '';
    
    console.log('Validation check:', {
      hasTrainingDoc,
      trainingDoc,
      question,
      answer
    });
    
    // If no training doc, require BOTH question and answer
    if (!hasTrainingDoc) {
      const hasQuestion = question && question.trim() !== '' && question !== 'none';
      const hasAnswer = answer && answer.trim() !== '' && answer !== 'none';
      
      console.log('Question/Answer validation:', {
        hasQuestion,
        hasAnswer,
        questionValue: question,
        answerValue: answer
      });
      
      if (!hasQuestion || !hasAnswer) {
        return NextResponse.json(
          { error: 'Both question and answer are required when no training document is uploaded' },
          { status: 400 }
        );
      }
    }

    // First, find the user by Clerk ID to get the actual UserID
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { ClerkID: userId },
          { UserID: userId }
        ]
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Set default values for question and answer if they're empty and we have a training doc
    const finalQuestion = (question && question.trim() !== '' && question !== 'none') ? question : 'none';
    const finalAnswer = (answer && answer.trim() !== '' && answer !== 'none') ? answer : 'none';

    // If there is a training document, create a TrainingDocument record
    let trainingDocumentRecord = null;
    if (trainingDoc) {
      trainingDocumentRecord = await prisma.trainingDocument.create({
        data: {
          title: trainingDoc.split('/').pop() || 'Training Document',
          content: trainingDocContent || '',
          fileUrl: trainingDoc,
          fileType: 'pdf',
          uploadedBy: userId,
          UserID: user.UserID,
          status: 'Active',
        },
      });
    }

    const newQuery = await prisma.aIChat.create({
      data: {
        Question: finalQuestion,
        Answer: finalAnswer,
        UserID: user.UserID,
        Status: 'Active',
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

    const formattedQuery = {
      id: newQuery.ChatID,
      createdBy: `${newQuery.User.FirstName} ${newQuery.User.LastName}`,
      question: newQuery.Question,
      answer: newQuery.Answer,
      date: newQuery.dateSubmitted.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }),
      trainingDoc: trainingDoc || null,
    };

    return NextResponse.json(formattedQuery, { status: 201 });
  } catch (error) {
    console.error('Error creating query:', error);
    return NextResponse.json(
      { error: 'Failed to create query' },
      { status: 500 }
    );
  }
}
