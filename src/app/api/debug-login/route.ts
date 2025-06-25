import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { hashWithSHA256 } from '@/lib/hash';

// Define the type for the user data returned from Supabase
interface UserWithRole {
  UserID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Status: string;
  isDeleted: boolean;
  PasswordHash: string | null;
  UserRole: {
    role: {
      name: string;
    };
  }[];
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugging login issues...');
    
    // Check all users with their roles
    const { data: users, error } = await supabaseAdmin
      .from('User')
      .select(`
        UserID,
        FirstName, 
        LastName,
        Email,
        Status,
        isDeleted,
        PasswordHash,
        UserRole (
          role:Role (
            name
          )
        )
      `)
      .order('DateCreated', { ascending: true });
      
    if (error) {
      console.error('❌ Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users', details: error }, { status: 500 });
    }
    
    console.log('\n📋 All users in database:');
    const userList = (users as UserWithRole[]).map((user: UserWithRole) => {
      const role = user.UserRole?.[0]?.role?.name || 'No role';
      return {
        email: user.Email,
        name: `${user.FirstName} ${user.LastName}`,
        role,
        status: user.Status,
        deleted: user.isDeleted,
        hasPassword: !!user.PasswordHash
      };
    });
    
    userList.forEach(user => {
      console.log(`- ${user.email} | ${user.name} | Role: ${user.role} | Status: ${user.status} | Deleted: ${user.deleted}`);
    });
    
    // Check for the specific email
    const targetEmail = 'sjsfisuper12345@gmail.com';
    const { data: specificUser } = await supabaseAdmin
      .from('User')
      .select(`
        UserID,
        FirstName, 
        LastName,
        Email,
        Status,
        isDeleted,
        PasswordHash,
        UserRole (
          role:Role (
            name
          )
        )
      `)
      .eq('Email', targetEmail)
      .single();
      
    let targetUserInfo = null;
    
    if (specificUser) {
      console.log(`\n✅ Found ${targetEmail} in database:`);
      const role = specificUser.UserRole?.[0]?.role?.name || 'No role';
      
      // Test the password hash
      const testPassword = '5450LS7JF<wg"=£.%Fx3fog5Wp|&^#';
      const { saltHash } = hashWithSHA256(testPassword);
      const passwordMatch = specificUser.PasswordHash === saltHash;
      
      targetUserInfo = {
        found: true,
        email: specificUser.Email,
        name: `${specificUser.FirstName} ${specificUser.LastName}`,
        status: specificUser.Status,
        deleted: specificUser.isDeleted,
        role,
        hasPassword: !!specificUser.PasswordHash,
        userId: specificUser.UserID,
        passwordMatch
      };
      
      console.log('Password Hash exists:', !!specificUser.PasswordHash);
      console.log('Password Hash matches:', passwordMatch);
      
    } else {
      console.log(`\n❌ Email ${targetEmail} not found in database`);
      targetUserInfo = { found: false };
    }
    
    return NextResponse.json({
      success: true,
      allUsers: userList,
      targetUser: targetUserInfo,
      message: 'Debug information retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'create-super-admin') {
      console.log('🛠️ Creating super admin account...');
      
      const email = 'sjsfisuper12345@gmail.com';
      const password = '5450LS7JF<wg"=£.%Fx3fog5Wp|&^#';
      const { saltHash } = hashWithSHA256(password);
      
      // First, ensure Super Admin role exists
      const { data: existingRole, error: roleError } = await supabaseAdmin
        .from('Role')
        .select('id')
        .eq('name', 'Super Admin')
        .single();

      let roleId: number;

      if (roleError && roleError.code === 'PGRST116') {
        // Role doesn't exist, create it
        const { data: newRole, error: createRoleError } = await supabaseAdmin
          .from('Role')
          .insert({ name: 'Super Admin' })
          .select('id')
          .single();

        if (createRoleError) {
          throw new Error(`Failed to create Super Admin role: ${createRoleError.message}`);
        }
        roleId = newRole.id;
        console.log('✅ Created Super Admin role');
      } else if (roleError) {
        throw new Error(`Failed to check Super Admin role: ${roleError.message}`);
      } else {
        roleId = existingRole.id;
        console.log('✅ Super Admin role exists');
      }
      
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('User')
        .select('UserID')
        .eq('Email', email)
        .single();
        
      if (existingUser) {
        // Update existing user
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('User')
          .update({
            FirstName: 'Super',
            LastName: 'Admin',
            PasswordHash: saltHash,
            Status: 'Active',
            isDeleted: false,
            DateModified: new Date().toISOString()
          })
          .eq('UserID', existingUser.UserID)
          .select('UserID')
          .single();

        if (updateError) {
          throw new Error(`Failed to update super admin: ${updateError.message}`);
        }

        // Update role assignment
        await supabaseAdmin
          .from('UserRole')
          .delete()
          .eq('userId', existingUser.UserID);

        const { error: userRoleError } = await supabaseAdmin
          .from('UserRole')
          .insert({
            userId: existingUser.UserID,
            roleId: roleId
          });

        if (userRoleError) {
          throw new Error(`Failed to update role: ${userRoleError.message}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Super admin updated successfully',
          userId: updatedUser.UserID,
          action: 'updated'
        });
      } else {
        // Create new user
        const userId = `SUPER-2025-${Date.now().toString().slice(-6)}`;
        
        const { data: newUser, error: createUserError } = await supabaseAdmin
          .from('User')
          .insert({
            UserID: userId,
            FirstName: 'Super',
            LastName: 'Admin',
            Email: email,
            PasswordHash: saltHash,
            Status: 'Active',
            DateCreated: new Date().toISOString(),
            isDeleted: false
          })
          .select('UserID')
          .single();

        if (createUserError) {
          throw new Error(`Failed to create super admin user: ${createUserError.message}`);
        }

        // Assign role to user
        const { error: userRoleError } = await supabaseAdmin
          .from('UserRole')
          .insert({
            userId: newUser.UserID,
            roleId: roleId
          });

        if (userRoleError) {
          throw new Error(`Failed to assign role to super admin: ${userRoleError.message}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Super admin created successfully',
          userId: newUser.UserID,
          action: 'created'
        });
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Failed to create/update super admin:', error);
    return NextResponse.json(
      { error: 'Operation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 