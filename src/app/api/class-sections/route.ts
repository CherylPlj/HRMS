import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching class sections from database...');
    
    // Test database connection first
    await prisma.$connect();
    console.log('Database connected successfully');
    
    const classSections = await prisma.classSection.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`Found ${classSections.length} class sections:`, classSections);
    return NextResponse.json(classSections);
  } catch (error) {
    console.error('Error fetching class sections:', error);
    
    // More detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch class sections',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 