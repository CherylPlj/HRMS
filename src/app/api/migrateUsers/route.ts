import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/clerk-sdk-node';
import type { EmailAddress } from '@clerk/clerk-sdk-node';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to validate Clerk ID format
function isValidClerkId(id: string): boolean {
  // Clerk IDs typically start with 'user_' or 'inv_'
  return id.startsWith('user_') || id.startsWith('inv_');
}

// Add test function to verify Supabase connection
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('User')
      .select('UserID, ClerkID')
      .limit(1);

    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }

    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return false;
  }
}

export async function POST() {
  try {
    // Test Supabase connection first
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Failed to connect to Supabase' },
        { status: 500 }
      );
    }

    // Get all users from Supabase
    const { data: supabaseUsers, error: supabaseError } = await supabase
      .from('User')
      .select('*')
      .eq('isDeleted', false);

    if (supabaseError) {
      throw new Error(`Failed to fetch Supabase users: ${supabaseError.message}`);
    }

    const results = {
      total: supabaseUsers.length,
      success: 0,
      failed: 0,
      skipped: 0,
      failedUsers: [] as string[],
      failureReasons: {} as Record<string, string>,
      userDetails: {} as Record<string, { 
        clerkId: string | null, 
        status: string,
        email: string,
        error?: string 
      }>
    };

    // Process each user
    for (const user of supabaseUsers) {
      try {
        // Store user details for reporting
        results.userDetails[user.UserID] = {
          clerkId: user.ClerkID,
          status: user.Status,
          email: user.Email
        };

        // First verify the user exists in Supabase
        const { data: userExists, error: userCheckError } = await supabase
          .from('User')
          .select('UserID')
          .eq('UserID', user.UserID)
          .single();

        if (userCheckError || !userExists) {
          console.error(`User ${user.UserID} not found in database:`, {
            error: userCheckError,
            userId: user.UserID
          });
          results.failed++;
          results.failedUsers.push(user.UserID);
          results.failureReasons[user.UserID] = 'User not found in database';
          results.userDetails[user.UserID].error = 'User not found in database';
          continue;
        }

        // --- NEW LOGIC: Try to match users without ClerkID ---
        if (!user.ClerkID) {
          // Try to find Clerk user by email
          console.log(`Looking up Clerk user for email: ${user.Email}`);
          const clerkUsers = await clerkClient.users.getUserList({ emailAddress: [user.Email] });
          console.log('Clerk users found:', clerkUsers);
          if (clerkUsers && clerkUsers.data.length > 0) {
            const clerkUser = clerkUsers.data[0];
            // Update Supabase with ClerkID
            const { error: updateError } = await supabase
              .from('User')
              .update({ ClerkID: clerkUser.id })
              .eq('UserID', user.UserID);
            if (updateError) {
              results.failed++;
              results.failedUsers.push(user.UserID);
              results.failureReasons[user.UserID] = 'Failed to update ClerkID in Supabase';
              results.userDetails[user.UserID].error = 'Failed to update ClerkID in Supabase';
              continue;
            }
            // Update local user object for further processing
            user.ClerkID = clerkUser.id;
            results.userDetails[user.UserID].clerkId = clerkUser.id;
            // Continue to rest of sync logic
          } else {
            // No Clerk user found for this email
            results.skipped++;
            results.failureReasons[user.UserID] = 'No Clerk user found for email';
            results.userDetails[user.UserID].error = 'No Clerk user found for email';
            continue;
          }
        }
        // --- END NEW LOGIC ---

        // Skip if user is marked as Inactive in Supabase
        if (user.Status === 'Inactive') {
          console.log(`Skipping user ${user.UserID} - Status is Inactive`);
          results.skipped++;
          results.failureReasons[user.UserID] = 'User is marked as Inactive';
          results.userDetails[user.UserID].error = 'User is marked as Inactive';
          continue;
        }

        // Validate ClerkID format
        if (!isValidClerkId(user.ClerkID)) {
          console.log(`Invalid ClerkID format for user ${user.UserID}: ${user.ClerkID}`);
          results.failed++;
          results.failedUsers.push(user.UserID);
          results.failureReasons[user.UserID] = `Invalid ClerkID format: ${user.ClerkID}`;
          results.userDetails[user.UserID].error = `Invalid ClerkID format: ${user.ClerkID}`;
          continue;
        }

        // Check if ClerkID is an invitation ID
        if (user.ClerkID.startsWith('inv_')) {
          console.log(`User ${user.UserID} has invitation ID, skipping status check`);
          results.skipped++;
          results.failureReasons[user.UserID] = `User has pending invitation: ${user.ClerkID}`;
          results.userDetails[user.UserID].error = `User has pending invitation: ${user.ClerkID}`;
          continue;
        }

        // Get user from Clerk
        let clerkUser;
        try {
          console.log(`Attempting to fetch Clerk user for ID: ${user.ClerkID}`);
          clerkUser = await clerkClient.users.getUser(user.ClerkID);
          
          if (!clerkUser) {
            console.error(`No Clerk user found for ID: ${user.ClerkID}`);
            results.failed++;
            results.failedUsers.push(user.UserID);
            results.failureReasons[user.UserID] = `Clerk user not found: ${user.ClerkID}`;
            results.userDetails[user.UserID].error = `Clerk user not found: ${user.ClerkID}`;
            continue;
          }

          // Log Clerk user details for debugging
          console.log(`Clerk user details for ${user.UserID}:`, {
            id: clerkUser.id,
            emailAddresses: clerkUser.emailAddresses,
            lastSignInAt: clerkUser.lastSignInAt,
            createdAt: clerkUser.createdAt,
            updatedAt: clerkUser.updatedAt,
            status: user.Status
          });

        } catch (clerkError) {
          console.error(`Error fetching Clerk user for ${user.UserID}:`, {
            error: clerkError,
            clerkId: user.ClerkID,
            email: user.Email,
            errorMessage: clerkError instanceof Error ? clerkError.message : 'Unknown error',
            errorStack: clerkError instanceof Error ? clerkError.stack : undefined
          });
          results.failed++;
          results.failedUsers.push(user.UserID);
          results.failureReasons[user.UserID] = `Failed to fetch Clerk user: ${user.ClerkID} - ${clerkError instanceof Error ? clerkError.message : 'Unknown error'}`;
          results.userDetails[user.UserID].error = `Failed to fetch Clerk user: ${user.ClerkID} - ${clerkError instanceof Error ? clerkError.message : 'Unknown error'}`;
          continue;
        }

        // Check if user has accepted invitation
        const hasAcceptedInvitation = clerkUser.emailAddresses.some(
          (email: EmailAddress) => email.verification?.status === 'verified'
        );

        console.log(`User ${user.UserID} invitation status:`, {
          hasAcceptedInvitation,
          currentStatus: user.Status,
          lastSignIn: clerkUser.lastSignInAt,
          emailAddresses: clerkUser.emailAddresses.map(e => ({
            email: e.emailAddress,
            verified: e.verification?.status === 'verified'
          }))
        });

        // Update status and last login in Supabase if needed
        if ((hasAcceptedInvitation && user.Status !== 'Active') || clerkUser.lastSignInAt) {
          console.log(`Updating user ${user.UserID} status and last login:`, {
            hasAcceptedInvitation,
            currentStatus: user.Status,
            lastSignIn: clerkUser.lastSignInAt,
            willUpdateStatus: hasAcceptedInvitation && user.Status !== 'Active',
            willUpdateLastLogin: !!clerkUser.lastSignInAt
          });

          // Convert Unix timestamp to ISO string if it exists
          const lastLoginDate = clerkUser.lastSignInAt 
            ? new Date(clerkUser.lastSignInAt).toISOString()
            : null;

          const { error: updateError } = await supabase
            .from('User')
            .update({ 
              Status: hasAcceptedInvitation ? 'Active' : user.Status,
              LastLogin: lastLoginDate,
              DateModified: new Date().toISOString()
            })
            .eq('UserID', user.UserID);

          if (updateError) {
            console.error(`Error updating user ${user.UserID}:`, {
              error: updateError,
              errorCode: updateError.code,
              errorMessage: updateError.message,
              errorDetails: updateError.details,
              updateData: {
                Status: hasAcceptedInvitation ? 'Active' : user.Status,
                LastLogin: lastLoginDate,
                DateModified: new Date().toISOString()
              }
            });
            throw new Error(`Failed to update user status: ${updateError.message}`);
          }
        }

        results.success++;
      } catch (error) {
        console.error(`Error processing user ${user.UserID}:`, {
          error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
          userData: {
            userId: user.UserID,
            clerkId: user.ClerkID,
            status: user.Status
          }
        });
        results.failed++;
        results.failedUsers.push(user.UserID);
        results.failureReasons[user.UserID] = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return NextResponse.json({ 
      results,
      failureReasons: results.failureReasons,
      userDetails: results.userDetails
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to migrate users' },
      { status: 500 }
    );
  }
} 