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

export async function POST(request: Request) {
  try {
    const { email, userId } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // First, get the current user data from Supabase to check existing ClerkID
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('ClerkID, Email')
      .eq(userId ? 'UserID' : 'Email', userId || email)
      .single();

    if (userError && userError.code !== 'PGRST116') { // Ignore not found error
      console.error('Error fetching user from Supabase:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data from database' },
        { status: 500 }
      );
    }

    // Try to find the user in Clerk using multiple methods
    let clerkUser;
    let searchErrors = [];

    // Method 1: Try existing ClerkID if available
    if (userData?.ClerkID) {
      try {
        clerkUser = await clerk.users.getUser(userData.ClerkID);
        console.log('Found user by existing ClerkID:', userData.ClerkID);
      } catch (error: any) {
        if (!error.message?.includes('could not be found')) {
          searchErrors.push(`ClerkID search failed: ${error.message}`);
        }
      }
    }

    // Method 2: Try exact email search
    if (!clerkUser) {
      try {
        const users = await clerk.users.getUserList({
          emailAddress: [email],
          limit: 1
        });
        if (users.data.length > 0) {
          clerkUser = users.data[0];
          console.log('Found user by exact email:', email);
        }
      } catch (error: any) {
        searchErrors.push(`Email search failed: ${error.message}`);
      }
    }

    // Method 3: Try case-insensitive email search
    if (!clerkUser) {
      try {
        const allUsers = await clerk.users.getUserList({
          limit: 100 // Increase limit to search more users
        });
        const matchingUser = allUsers.data.find(user => 
          user.emailAddresses.some(emailObj => 
            emailObj.emailAddress.toLowerCase() === email.toLowerCase()
          )
        );
        if (matchingUser) {
          clerkUser = matchingUser;
          console.log('Found user by case-insensitive email:', email);
        }
      } catch (error: any) {
        searchErrors.push(`Case-insensitive search failed: ${error.message}`);
      }
    }

    // Method 4: Try searching by primary email address variations
    if (!clerkUser && userData?.Email) {
      try {
        const users = await clerk.users.getUserList({
          emailAddress: [userData.Email],
          limit: 1
        });
        if (users.data.length > 0) {
          clerkUser = users.data[0];
          console.log('Found user by database email:', userData.Email);
        }
      } catch (error: any) {
        searchErrors.push(`Database email search failed: ${error.message}`);
      }
    }

    if (!clerkUser) {
      console.error('Search errors:', searchErrors);
      return NextResponse.json(
        { 
          error: 'No Clerk user found',
          details: [
            'Tried searching by:',
            userData?.ClerkID ? `- Existing ClerkID: ${userData.ClerkID}` : '- No existing ClerkID',
            `- Exact email: ${email}`,
            `- Case-insensitive email: ${email}`,
            userData?.Email ? `- Database email: ${userData.Email}` : '- No database email',
            '\nSearch errors:',
            ...searchErrors
          ]
        },
        { status: 404 }
      );
    }

    // Update the ClerkID in Supabase
    const { error: updateError } = await supabase
      .from('User')
      .update({ 
        ClerkID: clerkUser.id,
        DateModified: new Date().toISOString()
      })
      .eq(userId ? 'UserID' : 'Email', userId || email);

    if (updateError) {
      console.error('Error updating ClerkID:', updateError);
      return NextResponse.json(
        { error: 'Failed to update ClerkID in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'ClerkID updated successfully',
      clerkId: clerkUser.id,
      searchMethod: userData?.ClerkID ? 'existing_clerkid' : 
                   email === clerkUser.emailAddresses[0].emailAddress ? 'exact_email' :
                   'email_variation'
    });
  } catch (error) {
    console.error('Error refreshing ClerkID:', error);
    return NextResponse.json(
      { error: 'Failed to refresh ClerkID' },
      { status: 500 }
    );
  }
} 