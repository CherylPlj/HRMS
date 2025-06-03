import { clerkClient } from '@clerk/clerk-sdk-node';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Clean the user ID by removing any whitespace or newlines
    const userId = id.trim();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching user from Clerk:', userId); // Debug log

    try {
      const user = await clerkClient.users.getUser(userId);
      
      if (!user) {
        console.log('User not found in Clerk:', userId); // Debug log
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      console.log('Found user in Clerk:', user.id); // Debug log

      return NextResponse.json({
        imageUrl: user.imageUrl || '/manprofileavatar.png',
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (clerkError) {
      // If Clerk can't find the user, return a default response instead of error
      console.log('Clerk user not found, using default avatar:', userId);
      return NextResponse.json({
        imageUrl: '/manprofileavatar.png',
        firstName: 'Unknown',
        lastName: 'User'
      });
    }
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 