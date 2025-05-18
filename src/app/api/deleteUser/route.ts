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
    const { userId } = await request.json();
    const userIdNum = parseInt(userId);

    // Delete user from Supabase first
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('UserID', userIdNum);

    if (userError) {
      throw userError;
    }

    // Delete faculty record if exists
    const { error: facultyError } = await supabase
      .from('faculty')
      .delete()
      .eq('user_id', userIdNum);

    // Log activity
    await supabase
      .from('activity_logs')
      .insert([
        {
          user_id: userIdNum,
          action: 'user_deleted',
          details: 'User account deleted',
        },
      ]);

    // Delete user from Clerk
    await clerk.users.deleteUser(userId.toString());

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
} 