import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test basic database connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    // Test if we can access the aIChat table
    const queryCount = await prisma.aIChat.count();
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      data: {
        testQuery: result,
        aIChatCount: queryCount,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      }
    }, { status: 500 });
  }
} 