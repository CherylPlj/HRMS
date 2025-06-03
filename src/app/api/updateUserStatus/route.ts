import { NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';

// Initialize Clerk client
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function PUT(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Update user status to Active in Supabase
    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update({
        Status: 'Active',
        DateModified: new Date().toISOString()
      })
      .eq('UserID', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user status' },
        { status: 500 }
      );
    }

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Log the status change
    const { error: logError } = await supabase
      .from('ActivityLog')
      .insert([
        {
          UserID: userId,
          ActionType: 'user_status_updated',
          EntityAffected: 'User',
          ActionDetails: `User status updated to Active after successful sign-up`,
          Timestamp: new Date().toISOString(),
          IPAddress: request.headers.get('x-forwarded-for') || 'unknown'
        },
      ]);

    if (logError) {
      console.error('Error logging activity:', logError);
      // Don't throw error here, as the main update was successful
    }

    return NextResponse.json({
      success: true,
      message: 'User status updated to Active',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user status' },
      { status: 500 }
    );
  }
} 