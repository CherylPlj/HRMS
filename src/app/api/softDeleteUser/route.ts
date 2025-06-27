import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClerkClient } from '@clerk/clerk-sdk-node';

// Initialize Clerk client
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Initialize Supabase client
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

export async function PUT(request: Request) {
  try {
    const { userId, updatedBy } = await request.json();

    // Sanitize and validate inputs
    const sanitizedUserId = userId?.trim();
    const sanitizedUpdatedBy = updatedBy?.trim();

    if (!sanitizedUserId || !sanitizedUpdatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user details before update (including ClerkID)
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('FirstName, LastName, Email, Status, ClerkID')
      .eq('UserID', sanitizedUserId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user details' },
        { status: 500 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete from Clerk first if ClerkID exists
    let clerkDeleted = false;
    if (userData.ClerkID) {
      try {
        await clerk.users.deleteUser(userData.ClerkID);
        console.log(`Successfully deleted Clerk user: ${userData.ClerkID}`);
        clerkDeleted = true;
      } catch (clerkError) {
        console.error('Error deleting Clerk user:', clerkError);
        // Continue with Supabase deletion even if Clerk deletion fails
        // This ensures we don't leave orphaned records
      }
    }

    // Update user in Supabase to set isDeleted to true and clear email
    const { error: updateError } = await supabase
      .from('User')
      .update({
        isDeleted: true,
        Email: null, // Clear email to prevent conflicts when creating new accounts
        DateModified: new Date().toISOString(),
        updatedBy: sanitizedUpdatedBy
      })
      .eq('UserID', sanitizedUserId);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    // Log the activity
    await logActivity(
      sanitizedUpdatedBy,
      'user_deleted',
      'User',
      `Soft deleted user: ${userData.FirstName} ${userData.LastName} (${userData.Email})${clerkDeleted ? ' - Clerk account also deleted' : ' - No Clerk account found'}`,
      request.headers.get('x-forwarded-for') || 'system'
    );

    return NextResponse.json({
      message: 'User deleted successfully',
      userId: sanitizedUserId,
      clerkDeleted: clerkDeleted
    });

  } catch (error) {
    console.error('Error in soft delete user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: 500 }
    );
  }
} 