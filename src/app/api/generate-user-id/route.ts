import { NextRequest, NextResponse } from 'next/server';
import { generateUserId } from '@/lib/generateUserId';

export async function POST(request: NextRequest) {
  try {
    const { hireDate } = await request.json();
    
    // Convert the hire date string to Date object, or use current date if not provided
    const date = hireDate ? new Date(hireDate) : new Date();
    
    // Generate the user ID using the server-side function
    const userId = await generateUserId(date);
    
    return NextResponse.json({ userId });
  } catch (error) {
    console.error('Error generating user ID:', error);
    return NextResponse.json(
      { error: 'Failed to generate user ID' },
      { status: 500 }
    );
  }
} 