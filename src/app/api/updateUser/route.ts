import { NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';

// Initialize Clerk client
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function PUT(request: Request) {
  try {
    const { userId, firstName, lastName, email, role, status, updatedBy } = await request.json();

    if (!userId || !firstName || !lastName || !email || !role || !status || !updatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user details before update
    const { data: userData, error: userFetchError } = await supabase
      .from('User')
      .select(`
        FirstName,
        LastName,
        Email,
        Status,
        UserRole (
          role:Role (
            name
          )
        )
      `)
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

    // Get current role from UserRole
    const currentRole = userData.UserRole && userData.UserRole.length > 0
      ? (userData.UserRole[0].role as unknown as { name: string }).name
      : '';

    // Update user in Clerk if name, email, or status changed
    if (firstName || lastName || email || status) {
      try {
        const updateData: { 
          firstName?: string; 
          lastName?: string; 
          emailAddress?: string[];
          publicMetadata?: { status: string };
        } = {};
        
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (email) updateData.emailAddress = [email];
        if (status) updateData.publicMetadata = { status };

        // Try to get the user first to check if they exist
        const clerkUser = await clerk.users.getUser(userId);
        if (clerkUser) {
          await clerk.users.updateUser(userId, updateData);
        } else {
          console.warn(`Clerk user not found for ID: ${userId}. Skipping Clerk update.`);
          // If Clerk user doesn't exist, we should create it
          try {
            await clerk.users.createUser({
              firstName,
              lastName,
              emailAddress: [email],
              publicMetadata: {
                role,
                status
              }
            });
          } catch (clerkError) {
            console.error('Error creating Clerk user:', clerkError);
            // Continue with Supabase update even if Clerk update fails
          }
        }
      } catch (clerkError) {
        console.error('Error updating Clerk user:', clerkError);
        // If Clerk update fails, we should still update Supabase
        // but log the error for investigation
      }
    }

    // Update user in Supabase
    const { error: updateError } = await supabase
      .from('User')
      .update({
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Status: status,
        DateModified: new Date().toISOString(),
        updatedBy: updatedBy,
        isDeleted: false
      })
      .eq('UserID', userId)
      .select();

    if (updateError) {
      console.error('Error updating user in Supabase:', updateError);
      throw updateError;
    }

    // Update user role if changed
    if (currentRole !== role) {
      // First, get the role ID
      const { data: roleData, error: roleFetchError } = await supabase
        .from('Role')
        .select('id')
        .eq('name', role)
        .single();

      if (roleFetchError) {
        console.error('Error fetching role:', roleFetchError);
        throw new Error('Failed to fetch role details');
      }

      // Delete existing role
      const { error: deleteRoleError } = await supabase
        .from('UserRole')
        .delete()
        .eq('userId', userId);

      if (deleteRoleError) {
        console.error('Error deleting existing role:', deleteRoleError);
        throw deleteRoleError;
      }

      // Insert new role
      const { error: roleUpdateError } = await supabase
        .from('UserRole')
        .insert([{ userId: userId, roleId: roleData.id }])
        .select();

      if (roleUpdateError) {
        console.error('Error updating role:', roleUpdateError);
        throw roleUpdateError;
      }
    }

    // Log activity with detailed changes
    const changes = [];
    if (userData.FirstName !== firstName) changes.push(`First Name: ${userData.FirstName} → ${firstName}`);
    if (userData.LastName !== lastName) changes.push(`Last Name: ${userData.LastName} → ${lastName}`);
    if (userData.Email !== email) changes.push(`Email: ${userData.Email} → ${email}`);
    if (currentRole !== role) changes.push(`Role: ${currentRole} → ${role}`);
    if (userData.Status !== status) changes.push(`Status: ${userData.Status} → ${status}`);

    const { error: logError } = await supabase
      .from('ActivityLog')
      .insert([
        {
          UserID: updatedBy,
          ActionType: 'user_updated',
          EntityAffected: 'User',
          ActionDetails: `Updated user ${firstName} ${lastName} (${email}): ${changes.join(', ')}`,
          Timestamp: new Date().toISOString(),
          IPAddress: request.headers.get('x-forwarded-for') || 'unknown'
        },
      ])
      .select();

    if (logError) {
      console.error('Error logging activity:', logError);
      // Don't throw error here, as the main update was successful
    }

    return NextResponse.json({ 
      success: true,
      message: 'User updated successfully',
      changes: changes
    });
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 500 }
    );
  }
} 