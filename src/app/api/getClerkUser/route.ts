import { NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';

// Initialize Clerk client
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching Clerk data for ID:', userId);

    try {
      // First try to get the user
      const user = await clerk.users.getUser(userId);
      console.log('Found user in Clerk:', user.id);

      // Return only the necessary user data
      return NextResponse.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddresses[0]?.emailAddress,
        imageUrl: user.imageUrl,
        publicMetadata: user.publicMetadata
      });
    } catch (userError: any) {
      // If user not found, try to get the invitation
      if (userError.status === 404) {
        try {
          const invitationList = await clerk.invitations.getInvitationList();
          const invitation = invitationList.data.find(inv => inv.id === userId);
          
          if (!invitation) {
            throw new Error('Invitation not found');
          }

          console.log('Found invitation in Clerk:', invitation.id);

          // Return invitation data
          return NextResponse.json({
            id: invitation.id,
            firstName: invitation.publicMetadata?.firstName || '',
            lastName: invitation.publicMetadata?.lastName || '',
            emailAddress: invitation.emailAddress,
            imageUrl: null,
            publicMetadata: invitation.publicMetadata
          });
        } catch (invitationError: any) {
          console.error('Error fetching invitation:', invitationError);
          return NextResponse.json(
            { error: 'Neither user nor invitation found in Clerk' },
            { status: 404 }
          );
        }
      }

      // If it's not a 404 error, return the original error
      console.error('Error fetching Clerk user:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in getClerkUser:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 