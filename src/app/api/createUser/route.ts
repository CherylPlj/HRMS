import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { headers } from 'next/headers';
import { generateUserId } from '@/lib/generateUserId';
import crypto from 'crypto';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Clerk client
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Define valid roles and statuses
const VALID_ROLES = ['super admin', 'student', 'cashier', 'registrar', 'faculty', 'admin'] as const;
const VALID_STATUS = ['Invited', 'Active', 'Inactive'] as const;

type Role = typeof VALID_ROLES[number];
type Status = typeof VALID_STATUS[number];

// Generate a temporary password hash for database records
function generateTemporaryPasswordHash(): string {
  // Generate a random string
  const tempPassword = crypto.randomBytes(32).toString('hex');
  // Create a hash of the temporary password
  return crypto.createHash('sha256').update(tempPassword).digest('hex');
}

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
  let newUser: { UserID: string } | undefined;
  let userId: string | undefined;
  
  try {
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'system';

    const {
      firstName,
      lastName,
      email,
      role,
      createdBy,
      facultyData,
      employeeId
    } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !role || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Validate name fields (no special characters except spaces, hyphens, apostrophes)
    const nameRegex = /^[a-zA-Z\s\-\'\.]+$/;
    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      return NextResponse.json(
        { error: 'Names can only contain letters, spaces, hyphens, apostrophes, and periods' },
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

    // Check if user already exists in Supabase with this email (including all statuses)
    const { data: existingUsers, error: checkError } = await supabase
      .from('User')
      .select('UserID, Status, isDeleted, Email')
      .eq('Email', email);

    if (checkError) {
      return NextResponse.json(
        { error: 'Error checking existing user' },
        { status: 500 }
      );
    }

    // Check for any existing active or invited users
    const activeOrInvitedUser = existingUsers?.find(user => 
      !user.isDeleted && (user.Status === 'Active' || user.Status === 'Invited')
    );

    // Find any existing user with "No Account" status that we can update
    const noAccountUser = existingUsers?.find(user => 
      !user.isDeleted && user.Status === 'No Account'
    );

    if (activeOrInvitedUser) {
      return NextResponse.json(
        { error: `User already exists with status: ${activeOrInvitedUser.Status}` },
        { status: 409 }
      );
    }

    // Also check if user exists in Clerk
    try {
      const existingClerkUsers = await clerk.users.getUserList({
        emailAddress: [email]
      });
      
      if (existingClerkUsers.data && existingClerkUsers.data.length > 0) {
        const clerkUser = existingClerkUsers.data[0];
        console.log('Found existing Clerk user:', clerkUser.id, 'for email:', email);
        
        // If there's a Clerk user but no active Supabase user, this is an orphaned account
        if (!activeOrInvitedUser) {
          console.log('Orphaned Clerk account detected - User does not exist in Supabase or is deleted');
          
          // Try to delete the orphaned Clerk account automatically
          try {
            await clerk.users.deleteUser(clerkUser.id);
            console.log('Successfully deleted orphaned Clerk account:', clerkUser.id);
            
            // Wait a brief moment for Clerk to process the deletion
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (clerkDeleteError) {
            console.error('Failed to delete orphaned Clerk account:', clerkDeleteError);
            return NextResponse.json(
              { error: `Orphaned authentication account detected. Failed to clean up automatically. Please contact an administrator to remove Clerk user ${clerkUser.id} for email ${email}.` },
              { status: 409 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'User already exists in authentication system' },
            { status: 409 }
          );
        }
      }
    } catch (clerkCheckError) {
      console.error('Error checking existing Clerk user:', clerkCheckError);
      // Continue with the process - this is just a precautionary check
    }

    // Generate a unique UserID using centralized function if we don't have a noAccountUser
    userId = noAccountUser ? noAccountUser.UserID : await generateUserId(new Date());

    // If we have a noAccountUser, update it. Otherwise, create a new user.
    const userOperation = noAccountUser ? 
      supabase
        .from('User')
        .update({
          FirstName: firstName,
          LastName: lastName,
          Email: email,
          Status: 'Invited',
          createdBy: createdBy,
          DateModified: new Date().toISOString(),
          PasswordHash: 'CLERK_PENDING' // Add temporary password hash
        })
        .eq('UserID', userId)
        .select()
        .single()
      :
      supabase
        .from('User')
        .insert({
          UserID: userId,
          FirstName: firstName,
          LastName: lastName,
          Email: email,
          Status: 'Invited',
          createdBy: createdBy,
          DateCreated: new Date().toISOString(),
          DateModified: new Date().toISOString(),
          PasswordHash: 'CLERK_PENDING' // Use consistent format for pending Clerk users
        })
        .select()
        .single();

    const { data: newUserData, error: createError } = await userOperation;

    if (createError) {
      throw new Error(`Failed to ${noAccountUser ? 'update' : 'create'} user in database: ${createError.message}`);
    }

    newUser = newUserData;

    // If we're updating a noAccountUser, first remove any existing role assignments
    if (noAccountUser) {
      const { error: deleteRoleError } = await supabase
        .from('UserRole')
        .delete()
        .eq('userId', userId);

      if (deleteRoleError) {
        console.error('Error deleting existing role assignments:', deleteRoleError);
        // Continue anyway as this is not critical
      }
    }

    // Get role ID from Role table
    console.log('Looking for role:', role);
    const { data: roleData, error: roleError } = await supabase
      .from('Role')
      .select('id, name')
      .ilike('name', role)
      .single();

    if (roleError) {
      console.error('Error finding role:', roleError);
      throw new Error(`Failed to find role: ${roleError.message}`);
    }

    console.log('Found existing role:', roleData);

    // Create UserRole record
    const { error: userRoleError } = await supabase
      .from('UserRole')
      .insert({
        userId: userId,
        roleId: roleData.id
      });

    if (userRoleError) {
      console.error('Error creating user role:', userRoleError);
      throw new Error(`Failed to assign role: ${userRoleError.message}`);
    }

    console.log('Successfully assigned role to user');

    // Create actual Clerk invitation (not direct user creation)
    try {
      // Create Clerk invitation instead of direct user creation
      const redirectUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`;
      console.log('Creating Clerk invitation with:', {
        email,
        redirectUrl,
        envVars: {
          NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
        }
      });
      
      // Create Clerk invitation with retry logic to handle timing issues
      let invitation: { id: string } | undefined;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          invitation = await clerk.invitations.createInvitation({
            emailAddress: email,
            redirectUrl: redirectUrl,
            publicMetadata: {
              userId: userId, // Store our database UserID in Clerk metadata
              firstName: firstName,
              lastName: lastName,
              role: role
            }
          });
          console.log('Clerk invitation created successfully:', invitation.id);
          break;
        } catch (clerkError: any) {
          retryCount++;
          console.log(`Clerk invitation attempt ${retryCount} failed:`, clerkError.message);
          console.log('Full Clerk error details:', clerkError);
          
          if (clerkError.message?.includes('already exists') || clerkError.message?.includes('email_address_exists')) {
            if (retryCount < maxRetries) {
              console.log('User still exists in Clerk, checking for orphaned accounts...');
              
              // Try to clean up orphaned accounts again
              try {
                const existingClerkUsers = await clerk.users.getUserList({
                  emailAddress: [email]
                });
                
                if (existingClerkUsers.data && existingClerkUsers.data.length > 0) {
                  const existingClerkUser = existingClerkUsers.data[0];
                  await clerk.users.deleteUser(existingClerkUser.id);
                  console.log('Deleted orphaned Clerk account during retry');
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  continue;
                }
              } catch (cleanupError) {
                console.error('Failed to cleanup during retry:', cleanupError);
              }
            }
            
            if (retryCount >= maxRetries) {
              throw new Error('An authentication account with this email still exists after cleanup attempts. Please wait a few minutes and try again.');
            }
          } else {
            // For other errors, don't retry
            throw clerkError;
          }
        }
      }

      if (!invitation) {
        throw new Error('Failed to create invitation after retries');
      }

      // Update existing user record with invitation ID
      const { error: updateError } = await supabase
        .from('User')
        .update({
          invitationId: invitation.id,
          DateModified: new Date().toISOString()
        })
        .eq('UserID', userId);

      if (updateError) {
        // If updating user fails, revoke the Clerk invitation
        try {
          await clerk.invitations.revokeInvitation(invitation.id);
        } catch (revokeError) {
          console.error('Failed to revoke invitation after user update error:', revokeError);
        }
        throw new Error(`Failed to update user in database: ${updateError.message}`);
      }

      // Set up a webhook handler to update ClerkID when user accepts invitation
      const { error: webhookError } = await supabase
        .from('WebhookPending')
        .insert({
          type: 'clerk_invitation',
          invitationId: invitation.id,
          userId: userId,
          email: email.toLowerCase().trim(),
          createdAt: new Date().toISOString(),
          metadata: {
            firstName,
            lastName,
            role
          }
        });

      if (webhookError) {
        console.error('Failed to create webhook pending record:', webhookError);
      }

      // Send email with credentials using the existing email infrastructure
      try {
        // Import the email function
        const { sendEmail } = await import('@/lib/email');
        
        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #800000; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Welcome to HRMS</h1>
            </div>
            
            <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
              <p>Dear ${firstName} ${lastName},</p>
              
              <p>Your account has been created in the HRMS system at Saint Joseph School of Fairview Inc.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #800000;">Account Details:</h3>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>Role:</strong> ${role}</p>
                <p style="margin: 5px 0;"><strong>User ID:</strong> ${userId}</p>
              </div>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin: 0 0 10px 0; color: #856404;">Next Steps:</h3>
                <ol style="margin: 0; padding-left: 20px;">
                  <li>Click the invitation link in the separate email from Clerk</li>
                  <li>Complete your account setup</li>
                  <li>Set your password</li>
                  <li>You'll be redirected to the HRMS dashboard</li>
                </ol>
              </div>
              
              <p><strong>System Access URL:</strong><br>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="color: #800000;">${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}</a></p>
              
              <p>If you have any questions or need assistance, please contact the HR department.</p>
              
              <p>Best regards,<br>
              HR Department<br>
              Saint Joseph School of Fairview Inc.</p>
            </div>
            
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        `;

        await sendEmail({
          to: email,
          subject: 'HRMS Account Created - Welcome to Saint Joseph School of Fairview Inc.',
          html: emailContent
        });

        console.log('Welcome email sent successfully to:', email);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the user creation if email fails
      }

      // Log the activity
      await logActivity(
        createdBy,
        'user_created',
        'User',
        `Created new user account and sent invitation: ${firstName} ${lastName} (${email}) with role: ${role}`,
        ipAddress
      );

      return NextResponse.json({
        message: 'User account created successfully and invitation sent.',
        userId: userId,
        invitationId: invitation.id,
        note: 'User will receive an email invitation to complete account setup.'
      });

    } catch (clerkError) {
      console.error('Clerk invitation creation failed:', clerkError);
      console.error('Clerk error details:', {
        message: clerkError instanceof Error ? clerkError.message : 'Unknown error',
        status: (clerkError as any)?.status,
        errors: (clerkError as any)?.errors,
        clerkTraceId: (clerkError as any)?.clerkTraceId
      });
      
      // If Clerk invitation creation fails, mark the user as failed
      if (userId) {
        await supabase
          .from('User')
          .update({
            Status: 'Failed',
            DateModified: new Date().toISOString()
          })
          .eq('UserID', userId);
      }

      throw new Error('Failed to send invitation');
    }

  } catch (error: unknown) {
    // Mark the user as failed if it exists and userId is defined
    if (userId) {
      try {
        await supabase
          .from('User')
          .update({
            Status: 'Failed',
            DateModified: new Date().toISOString()
          })
          .eq('UserID', userId);
      } catch (cleanupError) {
        console.error('Failed to mark user as failed after error:', cleanupError);
      }
    }

    console.error('Error creating user:', error);
    
    // Type guard for error object with message property
    if (error && typeof error === 'object' && 'message' in error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unknown error occurred while creating the user' },
      { status: 500 }
    );
  }
}