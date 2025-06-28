import { NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function POST(request: Request) {
  try {
    const { email, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Email and userId are required' },
        { status: 400 }
      );
    }

    // Find the user in Clerk
    const clerkUsers = await clerk.users.getUserList({
      emailAddress: [email],
    });

    if (!clerkUsers.data || clerkUsers.data.length === 0) {
      return NextResponse.json(
        { error: 'No Clerk user found with this email' },
        { status: 404 }
      );
    }

    const clerkUser = clerkUsers.data[0];
    const isVerified = clerkUser.emailAddresses.some(
      email => email.verification?.status === 'verified'
    );

    if (!isVerified) {
      return NextResponse.json(
        { error: 'User email is not verified in Clerk' },
        { status: 400 }
      );
    }

    // Update the user's password hash in Supabase
    const { error: updateError } = await supabaseAdmin
      .from('User')
      .update({
        PasswordHash: 'CLERK_MANAGED',
        DateModified: new Date().toISOString()
      })
      .eq('UserID', userId);

    if (updateError) {
      console.error('Error updating password hash:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password hash' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Password hash updated successfully',
      clerkId: clerkUser.id
    });

  } catch (error) {
    console.error('Error refreshing password hash:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 