import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { headers } from 'next/headers';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Clerk client
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Define valid roles and statuses
const VALID_ROLES = ['admin', 'faculty', 'registrar', 'cashier', 'super admin'] as const;
const VALID_STATUS = ['Invited', 'Active', 'Inactive'] as const;

type Role = typeof VALID_ROLES[number];
type Status = typeof VALID_STATUS[number];

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
      firstName,
      lastName,
      email,
      role,
      createdBy,
      facultyData
    } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !role || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role
    if (!VALID_ROLES.includes(role.toLowerCase() as Role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user already exists in Supabase
    const { data: existingUser, error: checkError } = await supabase
      .from('User')
      .select('UserID, Status')
      .eq('Email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Error checking existing user' },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Generate a unique UserID
    const { data: sequence, error: sequenceError } = await supabase
      .from('UserIDSequence')
      .select('lastCount')
      .eq('year', new Date().getFullYear())
      .single();

    if (sequenceError && sequenceError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Error generating user ID' },
        { status: 500 }
      );
    }

    const year = new Date().getFullYear();
    const lastCount = sequence?.lastCount || 0;
    const newCount = lastCount + 1;
    const paddedCount = newCount.toString().padStart(4, '0');
    const userId = `USER-${year}-${paddedCount}`;

    // Create user in Supabase first
    const { data: newUser, error: createError } = await supabase
      .from('User')
      .insert({
        UserID: userId,
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Status: 'Invited',
        PasswordHash: '', // Empty password hash since user will set it in Clerk
        createdBy: createdBy,
        Photo: null // Initialize photo as null, will be updated when user accepts invitation
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: 'Error creating user in database' },
        { status: 500 }
      );
    }

    // Update the sequence
    if (sequence) {
      await supabase
        .from('UserIDSequence')
        .update({ lastCount: newCount })
        .eq('year', year);
    } else {
      await supabase
        .from('UserIDSequence')
        .insert({ year, lastCount: newCount });
    }

    // Get the role ID from the Role table
    const { data: roleData, error: roleError } = await supabase
      .from('Role')
      .select('id')
      .eq('name', role.charAt(0).toUpperCase() + role.slice(1).toLowerCase())
      .single();

    if (roleError) {
      return NextResponse.json(
        { error: 'Error getting role ID' },
        { status: 500 }
      );
    }

    // Assign role to user
    const { error: roleAssignError } = await supabase
      .from('UserRole')
      .insert({
        userId: userId,
        roleId: roleData.id
      });

    if (roleAssignError) {
      return NextResponse.json(
        { error: 'Error assigning role to user' },
        { status: 500 }
      );
    }

    // Create invitation in Clerk
    try {
      const invitation = await clerk.invitations.createInvitation({
        emailAddress: email,
        publicMetadata: {
          role: role.charAt(0).toUpperCase() + role.slice(1).toLowerCase(),
          firstName,
          lastName,
          facultyData: facultyData || null,
          userId: userId // Store our database UserID in Clerk metadata
        },
        redirectUrl: `${process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'https://pleased-jackal-93.accounts.dev/sign-up'}`
      });

      // Log the activity
      await logActivity(
        createdBy,
        'user_created',
        'User',
        `Created new user: ${firstName} ${lastName} (${email}) with role: ${role}`,
        ipAddress
      );

      return NextResponse.json({
        message: 'User created and invitation sent successfully',
        userId: userId,
        invitationId: invitation.id
      });

    } catch (clerkError) {
      // If Clerk invitation fails, delete the Supabase user
      await supabase
        .from('User')
        .delete()
        .eq('UserID', userId);

      throw clerkError;
    }

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}