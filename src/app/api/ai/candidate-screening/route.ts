import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { AIAgentService } from '@/services/aiAgentService';

const aiService = new AIAgentService();

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, vacancyId } = await req.json();

    if (!candidateId || !vacancyId) {
      return NextResponse.json(
        { error: 'Candidate ID and Vacancy ID are required' },
        { status: 400 }
      );
    }

    // Validate types
    if (typeof candidateId !== 'number' || typeof vacancyId !== 'number') {
      return NextResponse.json(
        { error: 'Candidate ID and Vacancy ID must be numbers' },
        { status: 400 }
      );
    }

    const result = await aiService.screenCandidate(candidateId, vacancyId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in candidate screening:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to screen candidate';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

