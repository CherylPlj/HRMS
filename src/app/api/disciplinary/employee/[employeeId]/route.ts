import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { disciplinaryService } from '@/services/disciplinaryService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await params;
    const history = await disciplinaryService.getEmployeeDisciplinaryHistory(employeeId);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching employee disciplinary history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee disciplinary history' },
      { status: 500 }
    );
  }
}

