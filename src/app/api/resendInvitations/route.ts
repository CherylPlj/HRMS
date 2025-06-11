import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function logActivity(
  userId: string,
  actionType: string,
  entityAffected: string,
  actionDetails: string,
  ipAddress: string = 'system'
) {
  try {
    const { error } = await supabase
      .from('ActivityLog')
      .insert([
        {
          UserID: userId,
          ActionType: actionType,
          EntityAffected: entityAffected,
          ActionDetails: actionDetails,
          Timestamp: new Date().toISOString(),
          IPAddress: ipAddress
        }
      ]);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
}

export async function GET() {
  try {
    // Get all invited users from Supabase
    const { data: invitedUsers, error: fetchError } = await supabase
      .from('User')
      .select('*')
      .eq('Status', 'Invited')
      .eq('isDeleted', false);

    if (fetchError) {
      throw fetchError;
    }

    const results = [];

    for (const user of invitedUsers) {
      try {
        // Get the invitation from Clerk
        const invitationsResponse = await clerkClient.invitations.getInvitationList();
        const invitations = invitationsResponse.data.filter(
          (inv: { emailAddress: string; status: string }) =>
            inv.emailAddress === user.Email && inv.status === 'pending'
        );

        if (invitations.length === 0) {
          // Create a new invitation if none exists
          const invitation = await clerkClient.invitations.createInvitation({
            emailAddress: user.Email,
            redirectUrl: `${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}?portal=${user.Role.toLowerCase()}`,
            publicMetadata: {
              role: user.Role,
              firstName: user.FirstName,
              lastName: user.LastName
            }
          });

          // Log the activity
          await logActivity(
            user.UserID,
            'invitation_auto_resent',
            'User',
            `Invitation automatically resent to ${user.FirstName} ${user.LastName} (${user.Email})`
          );

          results.push({
            userId: user.UserID,
            email: user.Email,
            status: 'resent',
            invitationId: invitation.id
          });
        } else {
          // Revoke existing invitation
          await clerkClient.invitations.revokeInvitation(invitations[0].id);

          // Create a new invitation
          const invitation = await clerkClient.invitations.createInvitation({
            emailAddress: user.Email,
            redirectUrl: `${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}?portal=${user.Role.toLowerCase()}`,
            publicMetadata: {
              role: user.Role,
              firstName: user.FirstName,
              lastName: user.LastName
            }
          });

          // Log the activity
          await logActivity(
            user.UserID,
            'invitation_auto_resent',
            'User',
            `Invitation automatically resent to ${user.FirstName} ${user.LastName} (${user.Email})`
          );

          results.push({
            userId: user.UserID,
            email: user.Email,
            status: 'resent',
            invitationId: invitation.id
          });
        }
      } catch (error) {
        console.error(`Error processing user ${user.UserID}:`, error);
        results.push({
          userId: user.UserID,
          email: user.Email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: 'Invitation resend process completed',
      results
    });
  } catch (error) {
    console.error('Error in resendInvitations:', error);
    return NextResponse.json(
      { error: 'Failed to process invitations' },
      { status: 500 }
    );
  }
} 