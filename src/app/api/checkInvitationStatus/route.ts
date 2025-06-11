import { NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check user status in Supabase
    const { data: userData, error: userError } = await supabaseAdmin
      .from('User')
      .select('Status, LastLogin')
      .eq('UserID', userId)
      .single();

    if (userError) {
      console.error('Error fetching user status:', userError);
      return NextResponse.json({ error: 'Failed to fetch user status' }, { status: 500 });
    }

    // Check invitation status in Clerk
    try {
      const user = await clerk.users.getUser(userId);
      const invitationStatus = user.publicMetadata.invitationStatus || 'unknown';

      return NextResponse.json({
        status: userData.Status,
        lastLogin: userData.LastLogin,
        invitationStatus,
        emailVerified: user.emailAddresses.some(email => email.verification?.status === 'verified')
      });
    } catch (clerkError) {
      console.error('Error fetching Clerk user:', clerkError);
      return NextResponse.json({
        status: userData.Status,
        lastLogin: userData.LastLogin,
        invitationStatus: 'unknown',
        error: 'Failed to fetch Clerk user data'
      });
    }
  } catch (error) {
    console.error('Error checking invitation status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 