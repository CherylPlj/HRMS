import { NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Initialize Clerk client
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const VALID_ROLES = ['Admin', 'Faculty', 'Cashier', 'Registrar'] as const;
type Role = typeof VALID_ROLES[number];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const VALID_STATUS = ['Active', 'Inactive'] as const;
type Status = typeof VALID_STATUS[number];

export async function POST(request: Request) {
  try {
    // Log environment variables (without exposing secrets)
    console.log('Environment check:', {
      hasClerkSecret: !!process.env.CLERK_SECRET_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    // Validate environment variables
    if (!process.env.CLERK_SECRET_KEY) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }

    const body = await request.json();
    console.log('Received request body:', { ...body, facultyData: '[REDACTED]' });

    const { email, firstName, lastName, role, facultyData } = body;

    // Validate required fields
    if (!email || !firstName || !lastName || !role) {
      console.log('Missing required fields:', { email, firstName, lastName, role });
      return NextResponse.json(
        { error: 'Missing required fields: email, firstName, lastName, and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate and normalize role
    const normalizedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    if (!VALID_ROLES.includes(normalizedRole as Role)) {
      console.log('Invalid role. Valid roles are:', VALID_ROLES);
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    console.log('Creating invitation in Clerk for:', { email, firstName, lastName, role: normalizedRole });

    // Create invitation in Clerk with metadata
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        role: normalizedRole,
        firstName,
        lastName,
        facultyData: facultyData || {}
      },
      // Use a public invite route
      redirectUrl: `${process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || 'http://localhost:3000'}/invite/${encodeURIComponent(email)}`,
      notify: true
    });

    if (!invitation) {
      throw new Error('Failed to create invitation');
    }

    console.log('Invitation created successfully:', invitation.id);

    // Generate a temporary password hash (never log this in clear text)
    const tempPasswordHash = Buffer.from(Math.random().toString()).toString('base64');

    // Prepare user data for Supabase
    const now = new Date().toISOString();
    const userData = {
      UserID: invitation.id,
      FirstName: firstName,
      LastName: lastName,
      Email: email.toLowerCase(),
      Photo: '',
      PasswordHash: tempPasswordHash,
      Role: normalizedRole as Role,
      Status: 'Active' as Status,
      DateCreated: now,
      DateModified: null,
      LastLogin: null
    };

    // Do not log password hash in clear text
    console.log('Creating temporary user record in Supabase:', { ...userData, PasswordHash: '[REDACTED]' });

    // Create temporary user record in Supabase
    const { data: createdUser, error: userError } = await supabaseAdmin
      .from('User')
      .insert([userData])
      .select()
      .single();

    if (userError) {
      // If Supabase insert fails, revoke the invitation
      await clerk.invitations.revokeInvitation(invitation.id);
      console.error('Supabase user creation error:', {
        error: userError,
        details: userError.details,
        hint: userError.hint,
        message: userError.message,
        code: userError.code
      });
      throw new Error(userError.message || 'Failed to create user in database');
    }

    if (!createdUser) {
      await clerk.invitations.revokeInvitation(invitation.id);
      throw new Error('User was not created in database');
    }

    console.log('Temporary user created in Supabase:', { ...createdUser, PasswordHash: '[REDACTED]' });

    // If user is faculty, create faculty record
    if (normalizedRole === 'Faculty' && facultyData) {
      console.log('Creating faculty record...');
      // Validate faculty-specific required fields
      if (
        !facultyData.position ||
        facultyData.department_id === undefined ||
        facultyData.department_id === null ||
        !facultyData.employment_status ||
        !facultyData.hire_date ||
        !facultyData.date_of_birth
      ) {
        // If faculty validation fails, delete both invitation and Supabase user
        await clerk.invitations.revokeInvitation(invitation.id);
        await supabaseAdmin.from('User').delete().eq('UserID', invitation.id);
        return NextResponse.json(
          { error: 'Missing required faculty fields: position, department_id, employment_status, hire_date, and date_of_birth are required' },
          { status: 400 }
        );
      }

      const facultyRecord = {
        user_id: invitation.id,
        date_of_birth: new Date(facultyData.date_of_birth).toISOString(),
        phone: facultyData.phone || null,
        address: facultyData.address || null,
        employment_status: facultyData.employment_status,
        hire_date: new Date(facultyData.hire_date).toISOString(),
        resignation_date: null,
        position: facultyData.position,
        department_id: facultyData.department_id,
        contract_id: null
      };

      console.log('Faculty data:', { ...facultyRecord, date_of_birth: '[REDACTED]' });

      const { error: facultyError } = await supabaseAdmin
        .from('faculty')
        .insert([facultyRecord]);

      if (facultyError) {
        // If faculty insert fails, delete invitation and Supabase user
        await clerk.invitations.revokeInvitation(invitation.id);
        await supabaseAdmin.from('User').delete().eq('UserID', invitation.id);
        console.error('Faculty record creation error:', {
          error: facultyError,
          details: facultyError.details,
          hint: facultyError.hint,
          message: facultyError.message,
          code: facultyError.code
        });
        throw new Error(facultyError.message || 'Failed to create faculty record');
      }
      console.log('Faculty record created successfully');
    }

    // Log activity
    console.log('Logging activity...');
    await supabaseAdmin
      .from('ActivityLog')
      .insert([
        {
          UserID: invitation.id,
          ActionType: 'invitation_sent',
          EntityAffected: 'User',
          ActionDetails: `Created new ${normalizedRole} account and sent invitation email`,
          Timestamp: now,
          IPAddress: request.headers.get('x-forwarded-for') || 'unknown'
        },
      ]);

    console.log('Activity logged successfully');

    return NextResponse.json({
      invitationId: invitation.id,
      message: 'Faculty invitation sent successfully. User will be created upon accepting the invitation.',
      user: { ...createdUser, PasswordHash: '[REDACTED]' }
    });
  } catch (error: unknown) {
    console.error('Error in createUser API:', error);
    return NextResponse.json(
      {
        error: typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : 'Failed to create user',
        details: typeof error === 'object' && error !== null && 'stack' in error ? (error as { stack?: string }).stack : undefined
      },
      { status: typeof error === 'object' && error !== null && 'status' in error ? (error as { status?: number }).status || 500 : 500 }
    );
  }
}