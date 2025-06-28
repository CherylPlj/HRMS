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
    const { userId, createdBy, deleteFromDbOnly } = await request.json();

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
      .or(`UserID.eq.${userId},Email.eq.${userId}`)
      .single();

    if (userFetchError && !deleteFromDbOnly) {
      console.error('Error fetching user details:', userFetchError);
      return NextResponse.json(
        { error: 'Failed to fetch user details' },
        { status: 404 }
      );
    }

    // Delete from Clerk first if ClerkID exists and we're not doing a DB-only delete
    let clerkDeleted = false;
    let clerkError = null;
    if (!deleteFromDbOnly && userData?.ClerkID && userData.ClerkID.trim() !== '') {
      try {
        // First verify if the Clerk user exists
        let clerkUser = null;
        try {
          clerkUser = await clerk.users.getUser(userData.ClerkID);
        } catch (getError: any) {
          // If error is not a "not found" error, it's a real error
          if (!getError.message?.includes('could not be found')) {
            throw getError;
          }
          console.warn(`Clerk user not found for ClerkID: ${userData.ClerkID}`);
        }

        if (clerkUser) {
          try {
            await clerk.users.deleteUser(userData.ClerkID);
            console.log(`Successfully deleted Clerk user: ${userData.ClerkID}`);
            clerkDeleted = true;
          } catch (deleteError: any) {
            // If we get a specific error about user not found, consider it a success
            if (deleteError.message?.includes('could not be found')) {
              console.log(`Clerk user ${userData.ClerkID} was already deleted`);
              clerkDeleted = true;
            } else {
              throw deleteError;
            }
          }
        }
      } catch (error: any) {
        console.error('Error deleting Clerk user:', error);
        clerkError = error.message || 'Unknown error deleting Clerk user';
        // Don't return here - we'll handle the error after database cleanup
      }
    }

    // If user has an associated employee record and we're not doing a DB-only delete, soft delete it
    let employeeSoftDeleted = false;
    if (!deleteFromDbOnly && userData?.EmployeeID) {
      try {
        // First soft delete the employee record
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

        // Also update any related records to maintain consistency
        const relatedTables = ['ContactInfo', 'GovernmentID', 'EmploymentDetail', 'Education', 'WorkExperience', 'Family', 'Certificate', 'Skill'];
        
        for (const table of relatedTables) {
          const { error: relatedError } = await supabase
            .from(table)
            .update({
              isDeleted: true,
              DateModified: new Date().toISOString(),
              updatedBy: createdBy
            })
            .eq('employeeId', userData.EmployeeID);

          if (relatedError) {
            console.error(`Error soft deleting ${table}:`, relatedError);
          }
        }
      } catch (employeeError) {
        console.error('Error soft deleting employee and related records:', employeeError);
      }
    }

    // Hard delete user from User table if it exists
    let userDeleted = false;
    if (userData) {
      const { error: deleteError } = await supabase
        .from('User')
        .delete()
        .or(`UserID.eq.${userId},Email.eq.${userId}`);

      if (deleteError) {
        console.error('Error hard deleting user:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete user from database' },
          { status: 500 }
        );
      }
      userDeleted = true;
    }

    // Log the activity
    const activityDetails = [
      userData ? `Hard deleted user: ${userData.FirstName} ${userData.LastName} (${userData.Email})` : `Deleted record for ${userId}`,
      !deleteFromDbOnly && clerkDeleted ? 'Clerk account deleted' : `Clerk account deletion ${clerkError ? 'failed: ' + clerkError : 'not attempted'}`,
      !deleteFromDbOnly && employeeSoftDeleted ? `Employee record soft deleted (${userData?.EmployeeID})` : 'No employee record affected'
    ].join(' - ');

    await logActivity(
      createdBy,
      'user_hard_deleted',
      'User',
      activityDetails,
      request.headers.get('x-forwarded-for') || 'system'
    );

    // If Clerk deletion failed but everything else succeeded, return a 207 status
    const status = clerkError ? 207 : 200;
    
    return NextResponse.json({ 
      message: deleteFromDbOnly 
        ? 'Record deleted successfully'
        : clerkError 
          ? 'User account deleted from database but Clerk deletion failed' 
          : 'User account deleted successfully',
      userId,
      clerkDeleted,
      employeeSoftDeleted,
      userDeleted,
      clerkError,
      details: {
        userDeleted,
        clerkDeleted,
        employeeSoftDeleted,
        clerkError
      }
    }, { status });
  } catch (error: unknown) {
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user account' },
      { status: 500 }
    );
  }
} 