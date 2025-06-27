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

    // Get user details including ClerkID and EmployeeID before deletion
    const { data: userData, error: userFetchError } = await supabase
      .from('User')
      .select('FirstName, LastName, Email, ClerkID, EmployeeID')
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
    let clerkDeleted = false;
    if (userData.ClerkID && userData.ClerkID.trim() !== '') {
      try {
        // First verify if the Clerk user exists
        try {
          const clerkUser = await clerk.users.getUser(userData.ClerkID);
          if (clerkUser) {
            await clerk.users.deleteUser(userData.ClerkID);
            console.log(`Successfully deleted Clerk user: ${userData.ClerkID}`);
            clerkDeleted = true;
          } else {
            console.warn(`Clerk user not found for ClerkID: ${userData.ClerkID}`);
          }
        } catch (clerkGetError) {
          console.warn(`Error getting Clerk user (may not exist): ${userData.ClerkID}`, clerkGetError);
        }
      } catch (clerkError) {
        console.error('Error deleting Clerk user:', clerkError);
        // Continue with database deletion even if Clerk deletion fails
      }
    } else {
      console.warn(`No valid ClerkID found for user ${userId} (${userData.Email})`);
    }

    // If user has an associated employee record, soft delete it
    let employeeSoftDeleted = false;
    if (userData.EmployeeID) {
      try {
        const { error: employeeUpdateError } = await supabase
          .from('Employee')
          .update({
            isDeleted: true,
            DateModified: new Date().toISOString(),
            updatedBy: createdBy
          })
          .eq('EmployeeID', userData.EmployeeID);

        if (employeeUpdateError) {
          console.error('Error soft deleting employee:', employeeUpdateError);
        } else {
          employeeSoftDeleted = true;
          console.log(`Successfully soft deleted employee: ${userData.EmployeeID}`);
        }
      } catch (employeeError) {
        console.error('Error soft deleting employee:', employeeError);
      }
    }

    // Hard delete user from User table
    const { error: deleteError } = await supabase
      .from('User')
      .delete()
      .eq('UserID', userId);

    if (deleteError) {
      console.error('Error hard deleting user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user from database' },
        { status: 500 }
      );
    }

    // Log the activity
    const activityDetails = [
      `Hard deleted user: ${userData.FirstName} ${userData.LastName} (${userData.Email})`,
      clerkDeleted ? 'Clerk account deleted' : 'No Clerk account found',
      employeeSoftDeleted ? `Employee record soft deleted (${userData.EmployeeID})` : 'No employee record found'
    ].join(' - ');

    await logActivity(
      createdBy,
      'user_hard_deleted',
      'User',
      activityDetails,
      request.headers.get('x-forwarded-for') || 'system'
    );

    return NextResponse.json({ 
      message: 'User account deleted successfully',
      userId,
      clerkDeleted,
      employeeSoftDeleted,
      details: {
        userHardDeleted: true,
        clerkDeleted,
        employeeSoftDeleted
      }
    });
  } catch (error: unknown) {
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user account' },
      { status: 500 }
    );
  }
} 