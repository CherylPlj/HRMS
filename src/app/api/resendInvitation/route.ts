import { NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Check if user exists in Supabase
    const { data: userData, error: userError } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('UserID', userId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is in Invited status
    if (userData.Status !== 'Invited') {
      return NextResponse.json(
        { error: 'User is not in Invited status' },
        { status: 400 }
      );
    }

    // Revoke any existing invitations
   const invitationsResponse = await clerk.invitations.getInvitationList();
    const existingInvitation = invitationsResponse.data.find(
      (inv: { emailAddress: string; id: string }) => inv.emailAddress === email
    );

    if (existingInvitation) {
      console.log('Revoking existing invitation:', existingInvitation.id);
      await clerk.invitations.revokeInvitation(existingInvitation.id);
      
      // Wait for revocation to process
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Create new invitation
    const redirectUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || 'https://pleased-jackal-93.accounts.dev';
    const baseUrl = redirectUrl.replace(/\/$/, '');
    
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: baseUrl,
      publicMetadata: {
        userId: userId,
        role: userData.Role
      }
    });
    // Log the activity
    await supabaseAdmin
      .from('ActivityLog')
      .insert([
        {
          UserID: userId,
          ActionType: 'invitation_resent',
          EntityAffected: 'User',
          ActionDetails: `Invitation resent to ${email}`,
          Timestamp: new Date().toISOString(),
          IPAddress: 'system'
        }
      ]);

    return NextResponse.json({
      message: 'Invitation resent successfully',
      invitationId: invitation.id
    });

  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
} 