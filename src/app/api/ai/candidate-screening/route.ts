import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { AIAgentService } from '@/services/aiAgentService';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get('candidateId');
    const vacancyId = searchParams.get('vacancyId');

    if (!candidateId || !vacancyId) {
      return NextResponse.json(
        { error: 'Candidate ID and Vacancy ID are required' },
        { status: 400 }
      );
    }

    // Validate types
    const candidateIdNum = parseInt(candidateId, 10);
    const vacancyIdNum = parseInt(vacancyId, 10);

    if (isNaN(candidateIdNum) || isNaN(vacancyIdNum)) {
      return NextResponse.json(
        { error: 'Candidate ID and Vacancy ID must be valid numbers' },
        { status: 400 }
      );
    }

    // Fetch existing screening
    const screening = await prisma.candidateScreening.findUnique({
      where: {
        candidateId_vacancyId: {
          candidateId: candidateIdNum,
          vacancyId: vacancyIdNum,
        },
      },
    });

    if (!screening || screening.status !== 'Completed') {
      return NextResponse.json(
        { error: 'No completed screening found' },
        { status: 404 }
      );
    }

    // Convert database format to API response format
    const result = {
      overallScore: Number(screening.overallScore) || 0,
      resumeScore: Number(screening.resumeScore) || 0,
      qualificationScore: Number(screening.qualificationScore) || 0,
      experienceScore: Number(screening.experienceScore) || 0,
      skillMatchScore: Number(screening.skillMatchScore) || 0,
      recommendation: screening.recommendation,
      strengths: (screening.strengths as string[]) || [],
      weaknesses: (screening.weaknesses as string[]) || [],
      missingQualifications: (screening.missingQualifications as string[]) || [],
      suggestedQuestions: (screening.suggestedQuestions as string[]) || [],
      riskFactors: (screening.riskFactors as string[]) || [],
      aiAnalysis: screening.aiAnalysis || '',
      screenedAt: screening.screenedAt,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching candidate screening:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch screening';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

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

    // Instantiate service inside handler to ensure Prisma connection is ready
    const aiService = new AIAgentService();
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

