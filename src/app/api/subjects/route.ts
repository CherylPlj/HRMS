import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching subjects from database...');
    
    // Test database connection first
    await prisma.$connect();
    console.log('Database connected successfully');
    
    const subjects = await prisma.subject.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`Found ${subjects.length} subjects:`, subjects);
    return NextResponse.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    
    // More detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch subjects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 