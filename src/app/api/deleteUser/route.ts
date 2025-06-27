import { NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';

// Initialize Clerk client
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Add helper function to log activities
async function logActivity(
  userId: string,
  actionType: string,
  entityAffected: string,
  actionDetails: string,
  ipAddress: string = 'system'
) {
  try {
    await supabase
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
    console.log('Activity logged successfully:', { actionType, userId });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, createdBy } = await request.json();

    if (!userId || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user details including ClerkID before deletion
    const { data: userData, error: userFetchError } = await supabase
      .from('User')
      .select('FirstName, LastName, Email, ClerkID')
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

    // Delete from Clerk first if ClerkID exists
    if (userData.ClerkID) {
      try {
        await clerk.users.deleteUser(userData.ClerkID);
        console.log(`Successfully deleted Clerk user: ${userData.ClerkID}`);
      } catch (clerkError) {
        console.error('Error deleting Clerk user:', clerkError);
        // Continue with Supabase deletion even if Clerk deletion fails
        // This ensures we don't leave orphaned records
      }
    }

    // Soft delete user in Supabase
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

    // Log the activity
    await logActivity(
      createdBy,
      'user_deleted',
      'User',
      `Deleted user: ${userData.FirstName} ${userData.LastName} (${userData.Email})${userData.ClerkID ? ' - Clerk account also deleted' : ' - No Clerk account found'}`,
      request.headers.get('x-forwarded-for') || 'system'
    );

    return NextResponse.json({ 
      message: 'User account deleted successfully',
      userId,
      clerkDeleted: !!userData.ClerkID
    });
  } catch (error: unknown) {
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user account' },
      { status: 500 }
    );
  }
} 