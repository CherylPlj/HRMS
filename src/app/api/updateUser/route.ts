import { NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';

// Initialize Clerk client
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
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
    const { userId, firstName, lastName, email, role, status, updatedBy } = await request.json();

    // Sanitize and validate inputs
    const sanitizedUserId = userId?.trim();
    const sanitizedFirstName = firstName?.trim();
    const sanitizedLastName = lastName?.trim();
    const sanitizedEmail = email?.trim();
    const sanitizedRole = role?.trim();
    const sanitizedStatus = status?.trim();
    const sanitizedUpdatedBy = updatedBy?.trim();

    console.log('Status values:', {
      original: status,
      sanitized: sanitizedStatus,
      validStatuses: ['Invited', 'Active', 'Inactive']
    });

    if (!sanitizedUserId || !sanitizedFirstName || !sanitizedLastName || !sanitizedEmail || !sanitizedRole || !sanitizedStatus || !sanitizedUpdatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['Invited', 'Active', 'Inactive'];
    if (!validStatuses.includes(sanitizedStatus)) {
      return NextResponse.json(
        { error: 'Invalid status value. Must be one of: Invited, Active, Inactive' },
        { status: 400 }
      );
    }

    // Get user details before update
    console.log('Attempting to fetch user details for ID:', sanitizedUserId);
    
    // First, let's list all users to debug
    const { data: allUsers, error: listError } = await supabase
      .from('User')
      .select('*')  // Select all fields
      .order('UserID');

    console.log('All users in database:', {
      count: allUsers?.length || 0,
      users: allUsers?.map(u => ({
        id: u.UserID,
        name: `${u.FirstName} ${u.LastName}`,
        status: u.Status,
        isDeleted: u.isDeleted,
        email: u.Email,
        clerkId: u.ClerkID
      }))
    });

    // First, let's do a direct check without any filters
    const { data: directCheckData, error: directCheckError } = await supabase
      .from('User')
      .select('*')
      .or(`UserID.eq.${sanitizedUserId},UserID.eq.${sanitizedUserId}\\n`);  // Check both with and without newline

    console.log('Direct database check:', {
      data: directCheckData,
      error: directCheckError,
      userId: sanitizedUserId,
      query: 'SELECT * FROM "User" WHERE "UserID" = $1 OR "UserID" = $2',
      allUsers: allUsers?.map(u => u.UserID)
    });

    // If user not found at all, return 404
    if (!directCheckData || directCheckData.length === 0) {
      console.error('User not found in database:', {
        userId: sanitizedUserId,
        allUsers: allUsers?.map(u => u.UserID),
        searchQuery: sanitizedUserId,
        exactMatch: allUsers?.some(u => u.UserID.trim() === sanitizedUserId),
        caseInsensitiveMatch: allUsers?.some(u => u.UserID.trim().toLowerCase() === sanitizedUserId.toLowerCase())
      });
      return NextResponse.json(
        { error: `User with ID ${sanitizedUserId} not found in database` },
        { status: 404 }
      );
    }

    // Now check if user is deleted
    if (directCheckData[0].isDeleted) {
      console.error('User is marked as deleted:', {
        userId: sanitizedUserId,
        userData: directCheckData[0]
      });
      return NextResponse.json(
        { error: `User with ID ${sanitizedUserId} has been deleted` },
        { status: 404 }
      );
    }

    // If we get here, user exists and is not deleted
    const userData = directCheckData[0];
    const actualUserId = userData.UserID; // Store the actual ID from the database

    console.log('Found user in database:', {
      userId: sanitizedUserId,
      actualUserId: actualUserId,
      userData: {
        firstName: userData.FirstName,
        lastName: userData.LastName,
        email: userData.Email,
        status: userData.Status,
        isDeleted: userData.isDeleted
      }
    });

    // Now try the full query with joins
    const { data: fullUserData, error: userFetchError } = await supabase
      .from('User')
      .select(`
        FirstName,
        LastName,
        Email,
        Status,
        ClerkID,
        UserRole (
          role:Role (
            name
          )
        )
      `)
      .eq('UserID', actualUserId)  // Use the actual ID from the database
      .single();

    if (userFetchError) {
      console.error('Error fetching user details:', {
        error: userFetchError,
        errorCode: userFetchError.code,
        errorMessage: userFetchError.message,
        errorDetails: userFetchError.details,
        userId: sanitizedUserId
      });

      // If we have basic user data but the full query failed, we can still proceed
      if (userData) {
        console.log('Proceeding with basic user data:', userData);
        // Now try the full query with joins
        const { data: fullUserData, error: userFetchError } = await supabase
          .from('User')
          .select(`
            FirstName,
            LastName,
            Email,
            Status,
            ClerkID,
            UserRole (
              role:Role (
                name
              )
            )
          `)
          .eq('UserID', actualUserId)  // Use the actual ID from the database
          .single();
      } else {
        return NextResponse.json(
          { error: `Failed to fetch user details: ${userFetchError.message}` },
          { status: 500 }
        );
      }
    }

    if (!fullUserData) {
      console.error('No user data returned:', {
        userId: sanitizedUserId,
        query: {
          table: 'User',
          select: ['FirstName', 'LastName', 'Email', 'Status', 'ClerkID', 'UserRole'],
          filter: { UserID: sanitizedUserId }
        }
      });
      return NextResponse.json(
        { error: `User with ID ${sanitizedUserId} not found` },
        { status: 404 }
      );
    }

    // Get current role from UserRole
    const currentRole = fullUserData.UserRole?.[0]?.role ? ((fullUserData.UserRole[0].role as unknown) as { name: string }).name : '';

    console.log('Successfully fetched user details:', {
      userId: sanitizedUserId,
      userData: {
        firstName: fullUserData.FirstName,
        lastName: fullUserData.LastName,
        email: fullUserData.Email,
        status: fullUserData.Status,
        clerkId: fullUserData.ClerkID,
        currentRole: currentRole || 'No role assigned'
      }
    });

    // Update user in Clerk if name, email, or status changed
    if (sanitizedFirstName !== fullUserData.FirstName || 
        sanitizedLastName !== fullUserData.LastName || 
        sanitizedEmail !== fullUserData.Email || 
        sanitizedStatus !== fullUserData.Status) {
      try {
        const updateData: { 
          firstName?: string; 
          lastName?: string; 
          emailAddress?: string[];
          publicMetadata?: { status: string };
        } = {};
        
        if (sanitizedFirstName !== fullUserData.FirstName) updateData.firstName = sanitizedFirstName;
        if (sanitizedLastName !== fullUserData.LastName) updateData.lastName = sanitizedLastName;
        if (sanitizedEmail !== fullUserData.Email) updateData.emailAddress = [sanitizedEmail];
        if (sanitizedStatus !== fullUserData.Status) updateData.publicMetadata = { status: sanitizedStatus };

        // If we have a ClerkID, update the Clerk user
        if (fullUserData.ClerkID) {
          try {
            await clerk.users.updateUser(fullUserData.ClerkID, updateData);
          } catch (clerkError) {
            console.error('Error updating Clerk user:', clerkError);
            // If Clerk update fails, we should still update Supabase
          }
        } else {
          // If no ClerkID, create a new Clerk user
          try {
            const newClerkUser = await clerk.users.createUser({
              firstName: sanitizedFirstName,
              lastName: sanitizedLastName,
              emailAddress: [sanitizedEmail],
              publicMetadata: {
                role: sanitizedRole,
                status: sanitizedStatus
              }
            });
            
            // Update Supabase with the new Clerk ID
            await supabase
              .from('User')
              .update({ ClerkID: newClerkUser.id })
              .eq('UserID', sanitizedUserId);
              
          } catch (clerkError) {
            console.error('Error creating Clerk user:', clerkError);
            // Continue with Supabase update even if Clerk update fails
          }
        }
      } catch (clerkError) {
        console.error('Error in Clerk operations:', clerkError);
        // Continue with Supabase update even if Clerk operations fail
      }
    }

    // Update user in Supabase
    try {
      console.log('Starting Supabase update for user:', {
        userId: sanitizedUserId,
        actualUserId: actualUserId,
        updateData: {
          FirstName: sanitizedFirstName,
          LastName: sanitizedLastName,
          Email: sanitizedEmail,
          Status: sanitizedStatus,
          DateModified: new Date().toISOString(),
          updatedBy: sanitizedUpdatedBy
        }
      });
      
      // First verify the user exists
      const { data: verifyUser, error: initialVerifyError } = await supabase
        .from('User')
        .select('*')
        .eq('UserID', actualUserId)  // Use the actual ID from the database
        .single();

      if (initialVerifyError) {
        console.error('Error verifying user before update:', {
          error: initialVerifyError,
          userId: sanitizedUserId,
          actualUserId: actualUserId
        });
        throw new Error(`Failed to verify user: ${initialVerifyError.message}`);
      }

      if (!verifyUser) {
        console.error('User not found before update:', {
          userId: sanitizedUserId
        });
        throw new Error(`User with ID ${sanitizedUserId} not found`);
      }

      // Update user in Supabase
      const { data: updateData, error: updateError } = await supabase
        .from('User')
        .update({
          FirstName: sanitizedFirstName,
          LastName: sanitizedLastName,
          Email: sanitizedEmail,
          Status: sanitizedStatus as 'Invited' | 'Active' | 'Inactive',
          DateModified: new Date().toISOString(),
          updatedBy: sanitizedUpdatedBy
        })
        .eq('UserID', actualUserId)  // Use the actual ID from the database
        .select();

      if (updateError) {
        console.error('Error updating user in Supabase:', {
          error: updateError,
          errorCode: updateError.code,
          errorMessage: updateError.message,
          errorDetails: updateError.details,
          userId: sanitizedUserId,
          updateData: {
            FirstName: sanitizedFirstName,
            LastName: sanitizedLastName,
            Email: sanitizedEmail,
            Status: sanitizedStatus,
            DateModified: new Date().toISOString(),
            updatedBy: sanitizedUpdatedBy
          }
        });
        throw new Error(`Failed to update user: ${updateError.message}`);
      }

      if (!updateData || updateData.length === 0) {
        console.error('No data returned after update:', {
          userId: sanitizedUserId,
          updateData
        });
        throw new Error(`No user was updated with ID ${sanitizedUserId}`);
      }

      console.log('User updated successfully:', {
        userId: sanitizedUserId,
        updatedData: updateData[0]
      });

      // Verify the update was successful
      const { data: updatedUser, error: finalVerifyError } = await supabase
        .from('User')
        .select('*')
        .eq('UserID', actualUserId)  // Use the actual ID from the database
        .single();

      if (finalVerifyError) {
        console.error('Error verifying user update:', {
          error: finalVerifyError,
          errorCode: finalVerifyError.code,
          errorMessage: finalVerifyError.message,
          errorDetails: finalVerifyError.details,
          userId: sanitizedUserId
        });
        throw finalVerifyError;
      }

      if (!updatedUser) {
        console.error('User not found after update:', sanitizedUserId);
        throw new Error(`User with ID ${sanitizedUserId} not found after update`);
      }

      console.log('User updated successfully:', {
        userId: sanitizedUserId,
        updatedUser: {
          FirstName: updatedUser.FirstName,
          LastName: updatedUser.LastName,
          Email: updatedUser.Email,
          Status: updatedUser.Status,
          DateModified: updatedUser.DateModified,
          updatedBy: updatedUser.updatedBy
        }
      });

      // Update user role if changed
      if (currentRole !== sanitizedRole) {
        console.log('Updating user role:', { 
          userId: sanitizedUserId, 
          currentRole, 
          newRole: sanitizedRole 
        });

        try {
          // Get the role ID
          const { data: roleData, error: roleError } = await supabase
            .from('Role')
            .select('id')
            .eq('name', sanitizedRole.toUpperCase())
            .single();

          if (roleError || !roleData) {
            console.error('Error fetching role:', {
              error: roleError,
              role: sanitizedRole.toUpperCase()
            });
            throw new Error(`Role '${sanitizedRole}' not found`);
          }

          // Delete existing role
          await supabase
            .from('UserRole')
            .delete()
            .eq('userId', sanitizedUserId);

          // Insert new role
          const { error: insertError } = await supabase
            .from('UserRole')
            .insert([{ 
              userId: sanitizedUserId, 
              roleId: roleData.id 
            }]);

          if (insertError) {
            console.error('Error inserting new role:', {
              error: insertError,
              userId: sanitizedUserId,
              roleId: roleData.id
            });
            throw insertError;
          }

          console.log('Role updated successfully');
        } catch (roleError) {
          console.error('Error updating role:', roleError);
          // Continue even if role update fails
        }
      }

      // Log the activity
      await logActivity(
        sanitizedUpdatedBy,
        'user_updated',
        'User',
        `Updated user: ${sanitizedFirstName} ${sanitizedLastName} (${sanitizedEmail}) - Role: ${sanitizedRole}, Status: ${sanitizedStatus}`,
        request.headers.get('x-forwarded-for') || 'system'
      );

      return NextResponse.json({ 
        message: 'User updated successfully',
        userId: sanitizedUserId,
        updatedFields: {
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          email: sanitizedEmail,
          role: sanitizedRole,
          status: sanitizedStatus
        }
      });
    } catch (error) {
      console.error('Error in Supabase update:', {
        error,
        userId: sanitizedUserId,
        updateData: {
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          email: sanitizedEmail,
          role: sanitizedRole,
          status: sanitizedStatus
        }
      });
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to update user in database' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 500 }
    );
  }
} 