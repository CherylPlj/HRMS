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

export async function DELETE(request: Request) {
  try {
    const { userId, createdBy } = await request.json();

    if (!userId || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user details before marking as deleted
    const { data: userData, error: userFetchError } = await supabase
      .from('User')
      .select('FirstName, LastName, Email')
      .eq('UserID', userId)
      .single();

    if (userFetchError) {
      console.error('Error fetching user details:', userFetchError);
      return NextResponse.json(
        { error: 'Failed to fetch user details' },
        { status: 404 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user in Supabase to set isDeleted to true
    const { error: updateError } = await supabase
      .from('User')
      .update({
        isDeleted: true,
        DateModified: new Date().toISOString(),
        updatedBy: createdBy
      })
      .eq('UserID', userId);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to mark user as deleted' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase
      .from('ActivityLog')
      .insert([
        {
          UserID: createdBy,
          ActionType: 'user_deleted',
          EntityAffected: 'User',
          ActionDetails: `Marked user ${userData.FirstName} ${userData.LastName} (${userData.Email}) as deleted`,
          Timestamp: new Date().toISOString(),
          IPAddress: request.headers.get('x-forwarded-for') || 'unknown'
        },
      ]);

    return NextResponse.json({ 
      success: true,
      message: 'User marked as deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Error marking user as deleted:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark user as deleted' },
      { status: 500 }
    );
  }
} 