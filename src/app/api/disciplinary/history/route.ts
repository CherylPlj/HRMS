import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { disciplinaryService } from '@/services/disciplinaryService';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const histories = await disciplinaryService.getAllEmployeesWithDisciplinaryRecords();

    return NextResponse.json(histories);
  } catch (error) {
    console.error('Error fetching disciplinary histories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch disciplinary histories' },
      { status: 500 }
    );
  }
}

