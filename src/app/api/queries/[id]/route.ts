import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT - Update query
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { question, answer } = body;
    const queryId = parseInt(params.id);

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
        { status: 400 }
      );
    }

    const updatedQuery = await prisma.aIChat.update({
      where: { ChatID: queryId },
      data: {
        Question: question,
        Answer: answer,
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
      id: updatedQuery.ChatID,
      createdBy: `${updatedQuery.User.FirstName} ${updatedQuery.User.LastName}`,
      question: updatedQuery.Question,
      answer: updatedQuery.Answer,
      date: updatedQuery.dateSubmitted.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }),
      trainingDoc: null,
    };

    return NextResponse.json(formattedQuery);
  } catch (error) {
    console.error('Error updating query:', error);
    return NextResponse.json(
      { error: 'Failed to update query' },
      { status: 500 }
    );
  }
}

// DELETE - Delete query
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const queryId = parseInt(params.id);

    await prisma.aIChat.delete({
      where: { ChatID: queryId },
    });

    return NextResponse.json({ message: 'Query deleted successfully' });
  } catch (error) {
    console.error('Error deleting query:', error);
    return NextResponse.json(
      { error: 'Failed to delete query' },
      { status: 500 }
    );
  }
} 