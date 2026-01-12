import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/class-sections - Get all class sections
export async function GET() {
  try {
    const classSections = await prisma.classSection.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(classSections);
  } catch (error) {
    console.error('Error fetching class sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class sections' },
      { status: 500 }
    );
  }
}
