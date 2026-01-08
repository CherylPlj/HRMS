import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Activity logging function
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
      .insert({
        UserID: userId,
        ActionType: actionType,
        EntityAffected: entityAffected,
        ActionDetails: actionDetails,
        IPAddress: ipAddress
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
}

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'system';

    const {
      userId,
      deactivateCurrent,
      createdBy
    } = await request.json();

    // Validate required fields
    if (!userId || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and createdBy are required' },
        { status: 400 }
      );
    }

    // First, ensure Super Admin role exists
    const { data: existingRole, error: roleError } = await supabase
      .from('Role')
      .select('id, name')
      .eq('name', 'Super Admin')
      .single();

    let superAdminRoleId: number;

    if (roleError && roleError.code === 'PGRST116') {
      // Role doesn't exist, create it
      const { data: newRole, error: createRoleError } = await supabase
        .from('Role')
        .insert({ name: 'Super Admin' })
        .select('id')
        .single();

      if (createRoleError) {
        throw new Error(`Failed to create Super Admin role: ${createRoleError.message}`);
      }
      superAdminRoleId = newRole.id;
    } else if (roleError) {
      throw new Error(`Failed to check Super Admin role: ${roleError.message}`);
    } else {
      superAdminRoleId = existingRole.id;
    }

    // Verify the user exists and has Admin role
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select(`
        UserID,
        FirstName,
        LastName,
        Email,
        Status,
        UserRole (
          role:Role (
            id,
            name
          )
        )
      `)
      .eq('UserID', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has Admin role
    const userRoles = userData.UserRole || [];
    const hasAdminRole = userRoles.some((ur: any) => ur.role?.name === 'Admin');

    if (!hasAdminRole) {
      return NextResponse.json(
        { error: 'Only users with Admin role can be upgraded to Super Admin' },
        { status: 400 }
      );
    }

    // Check if user already has Super Admin role
    const hasSuperAdminRole = userRoles.some((ur: any) => ur.role?.name === 'Super Admin');

    if (hasSuperAdminRole) {
      return NextResponse.json(
        { error: 'User already has Super Admin role' },
        { status: 400 }
      );
    }

    // If deactivateCurrent is true, deactivate all current Super Admins
    if (deactivateCurrent) {
      // Get all users with Super Admin role
      const { data: superAdminUsers, error: superAdminError } = await supabase
        .from('UserRole')
        .select(`
          userId,
          User:User!inner (
            UserID,
            Status
          )
        `)
        .eq('roleId', superAdminRoleId);

      if (superAdminError) {
        console.error('Error fetching super admin users:', superAdminError);
      } else if (superAdminUsers && superAdminUsers.length > 0) {
        // Deactivate all current Super Admins (except the one being upgraded)
        const userIdsToDeactivate = superAdminUsers
          .map((sau: any) => {
            // Handle both array and object formats
            const user = Array.isArray(sau.User) ? sau.User[0] : sau.User;
            return user?.UserID;
          })
          .filter((id: string) => id && id !== userId);

        if (userIdsToDeactivate.length > 0) {
          const { error: deactivateError } = await supabase
            .from('User')
            .update({
              Status: 'Inactive',
              DateModified: new Date().toISOString()
            })
            .in('UserID', userIdsToDeactivate);

          if (deactivateError) {
            console.error('Error deactivating current super admins:', deactivateError);
            // Continue with the upgrade even if deactivation fails
          } else {
            // Log deactivation for each user
            for (const id of userIdsToDeactivate) {
              await logActivity(
                createdBy,
                'user_deactivated',
                'User',
                `Deactivated Super Admin user: ${id}`,
                ipAddress
              );
            }
          }
        }
      }
    }

    // Add Super Admin role to the user
    const { error: userRoleError } = await supabase
      .from('UserRole')
      .insert({
        userId: userId,
        roleId: superAdminRoleId
      });

    if (userRoleError) {
      // Check if it's a duplicate key error (role already exists)
      if (userRoleError.code === '23505') {
        return NextResponse.json(
          { error: 'User already has Super Admin role' },
          { status: 400 }
        );
      }
      throw new Error(`Failed to assign Super Admin role: ${userRoleError.message}`);
    }

    // Log the activity
    await logActivity(
      createdBy,
      'role_assigned',
      'User',
      `Upgraded user ${userData.FirstName} ${userData.LastName} (${userData.Email}) to Super Admin${deactivateCurrent ? ' and deactivated current super admins' : ''}`,
      ipAddress
    );

    return NextResponse.json({
      success: true,
      message: `User successfully upgraded to Super Admin${deactivateCurrent ? ' and current super admins were deactivated' : ''}`,
      userId: userId
    });

  } catch (error) {
    console.error('Error creating super admin:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create super admin' },
      { status: 500 }
    );
  }
}

