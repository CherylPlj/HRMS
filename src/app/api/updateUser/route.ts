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
    const { userId, role, status, firstName, lastName, email } = await request.json();
    const userIdNum = parseInt(userId);

    // Update user in Clerk if name or email changed
    if (firstName || lastName || email) {
      const updateData: any = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (email) updateData.emailAddress = [email];

      await clerk.users.updateUser(userId.toString(), updateData);
    }

    // Update user in Supabase
    const updateData: any = {
      DateModified: new Date().toISOString()
    };
    if (role) updateData.Role = role;
    if (status) updateData.Status = status;
    if (firstName) updateData.FirstName = firstName;
    if (lastName) updateData.LastName = lastName;
    if (email) updateData.Email = email.toLowerCase();

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('UserID', userIdNum);

    if (updateError) {
      throw updateError;
    }

    // If user is faculty and status changed, update faculty status
    if (role?.toLowerCase() === 'faculty' && status) {
      const { error: facultyError } = await supabase
        .from('faculty')
        .update({ status })
        .eq('user_id', userIdNum);

      if (facultyError) {
        throw facultyError;
      }
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert([
        {
          user_id: userIdNum,
          action: 'user_updated',
          details: 'User details updated',
        },
      ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
} 