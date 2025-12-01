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

    const { employeeId } = await req.json();

    if (!employeeId || typeof employeeId !== 'string') {
      return NextResponse.json(
        { error: 'Employee ID is required and must be a string' },
        { status: 400 }
      );
    }

    const result = await aiService.analyzeDisciplinaryRisk(employeeId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in disciplinary risk analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze disciplinary risk';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

