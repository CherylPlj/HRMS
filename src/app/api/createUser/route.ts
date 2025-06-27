import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { headers } from 'next/headers';
import { generateUserId } from '@/lib/generateUserId';

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

// Generate a secure temporary password
function generateTemporaryPassword(): string {
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // Ensure at least one of each required character type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // Uppercase
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // Lowercase
  password += "0123456789"[Math.floor(Math.random() * 10)]; // Number
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // Special character
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password to randomize character positions
  return password.split('').sort(() => Math.random() - 0.5).join('');
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

    // Check if user already exists in Supabase (including soft-deleted users)
    // Check if user already exists (only check active users since soft-deleted users have null emails)
    const { data: existingUser, error: checkError } = await supabase
      .from('User')
      .select('UserID, Status, isDeleted, EmployeeID')
      .eq('Email', email)
      .eq('isDeleted', false)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Error checking existing user' },
        { status: 500 }
      );
    }

    // Also check if user exists in Clerk (this can cause 422 errors)
    try {
      const existingClerkUsers = await clerk.users.getUserList({
        emailAddress: [email]
      });
      
      if (existingClerkUsers.data && existingClerkUsers.data.length > 0) {
        const clerkUser = existingClerkUsers.data[0];
        console.log('Found existing Clerk user:', clerkUser.id, 'for email:', email);
        
        // If there's a Clerk user but no active Supabase user, this is an orphaned account
        if (!existingUser || existingUser.isDeleted) {
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
        }
      }
    } catch (clerkCheckError) {
      console.error('Error checking existing Clerk user:', clerkCheckError);
      // Continue with the process - this is just a precautionary check
    }

    if (existingUser) {
      // If user exists (whether deleted or not), return error
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Generate a unique UserID using centralized function
    const userId = await generateUserId(new Date());

    // Create user in Supabase first
    const { data: newUserData, error: createError } = await supabase
      .from('User')
      .insert({
        UserID: userId,
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Role: role,
        Status: 'Pending',
        CreatedBy: createdBy,
        DateCreated: new Date().toISOString(),
        DateModified: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create user in database: ${createError.message}`);
    }

    newUser = newUserData;

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
            redirectUrl: redirectUrl
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
                  await clerk.users.deleteUser(existingClerkUsers.data[0].id);
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

      // Update the Supabase user record to stay in "Invited" status
      const { error: updateError } = await supabase
        .from('User')
        .update({
          Status: 'Invited',
          DateModified: new Date().toISOString()
        })
        .eq('UserID', userId);

      if (updateError) {
        // If updating Supabase fails, revoke the Clerk invitation to maintain consistency
        try {
          await clerk.invitations.revokeInvitation(invitation.id);
        } catch (revokeError) {
          console.error('Failed to revoke invitation after Supabase error:', revokeError);
        }
        throw new Error(`Failed to update user in database: ${updateError.message}`);
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
      
      // If Clerk invitation creation fails, delete the Supabase user
      await supabase
        .from('User')
        .delete()
        .eq('UserID', userId);

      throw new Error('Failed to send invitation');
    }

  } catch (error: unknown) {
    // Clean up the Supabase user if it was created
    if (newUser?.UserID) {
      try {
        await supabase
          .from('User')
          .delete()
          .eq('UserID', newUser.UserID);
      } catch (cleanupError) {
        console.error('Failed to clean up user after error:', cleanupError);
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