import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';
import { createClerkClient } from '@clerk/clerk-sdk-node';

// Initialize Resend only if API key is available
// const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const MAX_AUTO_RESEND_ATTEMPTS = 3;

// Define webhook event types
type WebhookEventType = 
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'invitation.expired'
  | 'session.created'
  | 'session.ended'
  | 'invitation.accepted';

interface UserCreatedEvent {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name: string;
  last_name: string;
  image_url: string;
}

interface UserUpdatedEvent {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name: string;
  last_name: string;
  image_url: string;
}

interface SessionCreatedEvent {
  user_id: string;
}

interface SessionEndedEvent {
  user_id: string;
}

interface InvitationExpiredEvent {
  id: string;
  email_address: string;
}

interface InvitationAcceptedEvent {
  id: string;
  email_address: string;
  user_id: string;
}

interface AdminUser {
  Email: string;
  FirstName: string;
  LastName: string;
}

// Update the logActivity function to handle errors better and ensure proper logging
async function logActivity(
  userId: string | undefined,
  actionType: string,
  entityAffected: string,
  actionDetails: string,
  ipAddress: string = 'system'
) {
  try {
    if (!userId) {
      console.warn('Attempted to log activity without userId');
      return;
    }

    console.log('Logging activity:', {
      userId,
      actionType,
      entityAffected,
      actionDetails,
      ipAddress
    });

    const { data, error } = await supabaseAdmin
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
      ])
      .select();

    if (error) {
      console.error('Error logging activity:', error);
      throw error;
    }

    console.log('Activity logged successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to log activity:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    // Get the headers
    const headersList = await headers();
    const svix_id = headersList.get('svix-id');
    const svix_timestamp = headersList.get('svix-timestamp');
    const svix_signature = headersList.get('svix-signature');

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('Missing Svix headers:', { svix_id, svix_timestamp, svix_signature });
      return NextResponse.json(
        { error: 'Error occurred -- no svix headers' },
        { status: 400 }
      );
    }

    // Get the body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

    let evt: WebhookEvent;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return NextResponse.json(
        { error: 'Error occurred during webhook verification' },
        { status: 400 }
      );
    }

    console.log('Webhook event received:', evt.type);

    const eventType = evt.type as WebhookEventType;
    const ipAddress = req.headers.get('x-forwarded-for') || 'system';

    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data as UserCreatedEvent;
        const email = email_addresses[0]?.email_address;

        console.log('Processing user.created webhook:', {
          clerkId: id,
          email,
          firstName: first_name,
          lastName: last_name
        });

        if (!email) {
          console.error('No email found in webhook data:', evt.data);
          return NextResponse.json(
            { error: 'No email found' },
            { status: 400 }
          );
        }

        try {
          let userData = null;
          let findError = null;
          let retryCount = 0;
          const maxRetries = 3;

          // Retry loop for finding the user
          while (retryCount < maxRetries && (!userData || findError)) {
            if (retryCount > 0) {
              console.log(`Retry ${retryCount} - Waiting before searching for user...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between retries
            }

            // First, try to find user by ClerkID (existing user)
            const result = await supabaseAdmin
              .from('User')
              .select('UserID, FirstName, LastName, Status, ClerkID, PasswordHash')
              .eq('ClerkID', id)
              .single();

            if (result.error && result.error.code === 'PGRST116') { // No rows returned
              // If not found by ClerkID, try to find by email
              const emailResult = await supabaseAdmin
                .from('User')
                .select('UserID, FirstName, LastName, Status, ClerkID, PasswordHash')
                .eq('Email', email)
                .single();

              userData = emailResult.data;
              findError = emailResult.error;
            } else {
              userData = result.data;
              findError = result.error;
            }

            console.log(`Search attempt ${retryCount + 1} result:`, { userData, findError });
            retryCount++;
          }

          let userIdForLogging = id;
          
          if (userData) {
            // Retry loop for updating the user
            retryCount = 0;
            let updateResult = null;
            let updateError = null;

            while (retryCount < maxRetries && (!updateResult || updateError)) {
              if (retryCount > 0) {
                console.log(`Retry ${retryCount} - Waiting before updating user...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between retries
              }

              const result = await supabaseAdmin
                .from('User')
                .update({ 
                  ClerkID: id,
                  Status: 'Active',
                  DateModified: new Date().toISOString(),
                  LastLogin: new Date().toISOString(),
                  Photo: image_url || null,
                  PasswordHash: 'CLERK_MANAGED'
                })
                .eq('UserID', userData.UserID)
                .select();

              updateResult = result.data;
              updateError = result.error;

              console.log(`Update attempt ${retryCount + 1} result:`, { updateResult, updateError });
              retryCount++;
            }

            if (updateError || !updateResult) {
              console.error('Error updating user with ClerkID after retries:', updateError);
              await logActivity(
                userData.UserID,
                'user_creation_error',
                'User',
                `Failed to update user ${userData.UserID} with ClerkID after ${maxRetries} attempts`,
                ipAddress
              );
              return NextResponse.json(
                { error: 'Failed to update user with ClerkID' },
                { status: 500 }
              );
            }

            userIdForLogging = userData.UserID;

            // Log the user activation
            await logActivity(
              userData.UserID,
              'user_activated',
              'User',
              `User ${userData.FirstName} ${userData.LastName} (${email}) accepted invitation and activated their account. ClerkID: ${id}`,
              ipAddress
            );
          } else {
            // This is a direct signup (not through invitation) - create a new user record
            console.log(`Direct signup detected for ${email} - creating new user record`);
            
            // Generate a unique UserID
            const { generateUserId } = await import('@/lib/generateUserId');
            const userId = await generateUserId(new Date());

            const { data: newUser, error: createError } = await supabaseAdmin
              .from('User')
              .insert({
                UserID: userId,
                FirstName: first_name || '',
                LastName: last_name || '',
                Email: email,
                Status: 'Active',
                ClerkID: id,
                PasswordHash: 'CLERK_MANAGED',
                Photo: image_url || null,
                DateModified: new Date().toISOString(),
                LastLogin: new Date().toISOString()
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating new user record:', createError);
              await logActivity(
                id,
                'user_creation_error',
                'User',
                `Failed to create user record for direct signup ${email}`,
                ipAddress
              );
              return NextResponse.json(
                { error: 'Failed to create user record' },
                { status: 500 }
              );
            }

            await logActivity(
              userId,
              'user_created',
              'User',
              `Created new user record for direct signup ${first_name} ${last_name} (${email})`,
              ipAddress
            );
          }

          // Send welcome email only if RESEND_API_KEY is configured
          if (process.env.RESEND_API_KEY && userData) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            try {
              await resend.emails.send({
                from: 'HRMS <noreply@yourdomain.com>',
                to: email,
                subject: 'Welcome to HRMS - Your Account is Active',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Welcome to HRMS!</h1>
                    <p>Dear ${userData.FirstName} ${userData.LastName},</p>
                    <p>Your account has been successfully activated. You can now log in to the HRMS system.</p>
                    <p>Best regards,<br>HRMS Team</p>
                  </div>
                `
              });
            } catch (emailError) {
              console.error('Error sending welcome email:', emailError);
              // Don't fail the webhook if email fails
            }
          } else {
            console.warn('Resend API key not configured or user data not found, skipping welcome email');
          }

          return NextResponse.json({ success: true });
        } catch (error) {
          console.error('Error processing user.created webhook:', error);
          return NextResponse.json(
            { 
              error: 'Internal Server Error',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data as UserUpdatedEvent;
        const email = email_addresses[0]?.email_address;

        try {
          // Find the user by ClerkID first
          const { data: userData, error: findError } = await supabaseAdmin
            .from('User')
            .select('UserID')
            .eq('ClerkID', id)
            .single();

          if (findError || !userData) {
            console.warn(`User not found for ClerkID ${id} during update`);
            return NextResponse.json({ success: true }); // Don't fail webhook for missing user
          }

          // Update user data in Supabase, including clearing password hash since Clerk handles auth
          const { error: updateError } = await supabaseAdmin
            .from('User')
            .update({ 
              DateModified: new Date().toISOString(),
              Photo: image_url || null,
              PasswordHash: 'CLERK_MANAGED' // Indicate that password is managed by Clerk
            })
            .eq('ClerkID', id);

          if (updateError) {
            console.error('Error updating user data in Supabase:', updateError);
            return NextResponse.json(
              { error: 'Failed to update user data' },
              { status: 500 }
            );
          }

          // Log the user update
          await logActivity(
            userData.UserID,
            'user_updated',
            'User',
            `User profile updated: ${first_name} ${last_name} (${email})`,
            ipAddress
          );

          return NextResponse.json({ success: true });
        } catch (error) {
          console.error('Error processing user.updated webhook:', error);
          return NextResponse.json(
            { 
              error: 'Internal Server Error',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'user.deleted': {
        const { id } = evt.data as { id: string };
        try {
          // Find the user by ClerkID first
          const { data: userData, error: findError } = await supabaseAdmin
            .from('User')
            .select('UserID')
            .eq('ClerkID', id)
            .single();

          if (findError || !userData) {
            console.warn(`User not found for ClerkID ${id} during deletion`);
            return NextResponse.json({ success: true }); // Don't fail webhook for missing user
          }

          await logActivity(
            userData.UserID,
            'user_deleted',
            'User',
            'User account deleted',
            ipAddress
          );

          // Update user status in Supabase
          const { error: updateError } = await supabaseAdmin
            .from('User')
            .update({ 
              Status: 'Inactive',
              DateModified: new Date().toISOString(),
              isDeleted: true
            })
            .eq('ClerkID', id);

          if (updateError) {
            console.error('Error updating user status in Supabase:', updateError);
            return NextResponse.json(
              { error: 'Failed to update user status' },
              { status: 500 }
            );
          }

          return NextResponse.json({ success: true });
        } catch (error) {
          console.error('Error processing user.deleted webhook:', error);
          return NextResponse.json(
            { 
              error: 'Internal Server Error',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'session.created': {
        const { user_id } = evt.data as SessionCreatedEvent;
        try {
          // Find the user by ClerkID
          const { data: userData, error: findError } = await supabaseAdmin
            .from('User')
            .select('UserID')
            .eq('ClerkID', user_id)
            .single();

          if (findError || !userData) {
            console.warn(`User not found for ClerkID ${user_id} during session creation`);
            return NextResponse.json({ success: true }); // Don't fail webhook for missing user
          }

          await logActivity(
            userData.UserID,
            'session_created',
            'User',
            'User session created',
            ipAddress
          );

          // Update last login time
          const { error: updateError } = await supabaseAdmin
            .from('User')
            .update({ 
              LastLogin: new Date().toISOString()
            })
            .eq('ClerkID', user_id);

          if (updateError) {
            console.error('Error updating last login time:', updateError);
            return NextResponse.json(
              { error: 'Failed to update last login time' },
              { status: 500 }
            );
          }

          return NextResponse.json({ success: true });
        } catch (error) {
          console.error('Error processing session.created webhook:', error);
          return NextResponse.json(
            { 
              error: 'Internal Server Error',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'session.ended': {
        const { user_id } = evt.data as SessionEndedEvent;
        try {
          // Find the user by ClerkID
          const { data: userData, error: findError } = await supabaseAdmin
            .from('User')
            .select('UserID')
            .eq('ClerkID', user_id)
            .single();

          if (findError || !userData) {
            console.warn(`User not found for ClerkID ${user_id} during session end`);
            return NextResponse.json({ success: true }); // Don't fail webhook for missing user
          }

          await logActivity(
            userData.UserID,
            'session_ended',
            'User',
            'User session ended',
            ipAddress
          );
          return NextResponse.json({ success: true });
        } catch (error) {
          console.error('Error processing session.ended webhook:', error);
          return NextResponse.json(
            { 
              error: 'Internal Server Error',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'invitation.expired': {
        const { id, email_address } = evt.data as InvitationExpiredEvent;
        try {
          await logActivity(
            id,
            'invitation_expired',
            'User',
            `Invitation expired for ${email_address}`,
            ipAddress
          );
          return NextResponse.json({ success: true });
        } catch (error) {
          console.error('Error processing invitation.expired webhook:', error);
          return NextResponse.json(
            { 
              error: 'Internal Server Error',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'invitation.accepted': {
        const data = evt.data as unknown as InvitationAcceptedEvent;
        const { id, email_address, user_id } = data;

        console.log('Processing invitation.accepted webhook:', {
          invitationId: id,
          email: email_address,
          clerkUserId: user_id
        });

        try {
          let userData = null;
          let findError = null;
          let retryCount = 0;
          const maxRetries = 3;

          // Retry loop for finding the user
          while (retryCount < maxRetries && (!userData || findError)) {
            if (retryCount > 0) {
              console.log(`Retry ${retryCount} - Waiting before searching for user...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between retries
            }

            // Find the user by email address and update with ClerkID
            const result = await supabaseAdmin
              .from('User')
              .select('UserID, FirstName, LastName, Status, ClerkID, PasswordHash')
              .eq('Email', email_address)
              .eq('Status', 'Invited')
              .single();

            userData = result.data;
            findError = result.error;

            console.log(`Search attempt ${retryCount + 1} result:`, { userData, findError });
            retryCount++;
          }

          if (findError || !userData) {
            console.error('Error finding invited user by email after retries:', findError);
            await logActivity(
              user_id,
              'invitation_accepted_error',
              'User',
              `Failed to find invited user with email ${email_address} after ${maxRetries} attempts`,
              ipAddress
            );
            return NextResponse.json(
              { error: 'User not found or not in invited status' },
              { status: 404 }
            );
          }

          // Retry loop for updating the user
          retryCount = 0;
          let updateResult = null;
          let updateError = null;

          while (retryCount < maxRetries && (!updateResult || updateError)) {
            if (retryCount > 0) {
              console.log(`Retry ${retryCount} - Waiting before updating user...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between retries
            }

            const result = await supabaseAdmin
              .from('User')
              .update({
                ClerkID: user_id,
                Status: 'Active',
                DateModified: new Date().toISOString(),
                PasswordHash: 'CLERK_MANAGED'
              })
              .eq('UserID', userData.UserID)
              .select();

            updateResult = result.data;
            updateError = result.error;

            console.log(`Update attempt ${retryCount + 1} result:`, { updateResult, updateError });
            retryCount++;
          }

          if (updateError || !updateResult) {
            console.error('Error updating user with ClerkID after retries:', updateError);
            await logActivity(
              user_id,
              'invitation_accepted_error',
              'User',
              `Failed to update user ${userData.UserID} with ClerkID after ${maxRetries} attempts`,
              ipAddress
            );
            return NextResponse.json(
              { error: 'Failed to update user with ClerkID' },
              { status: 500 }
            );
          }

          await logActivity(
            userData.UserID,
            'invitation_accepted',
            'User',
            `Invitation accepted by ${userData.FirstName} ${userData.LastName} (${email_address}). ClerkID ${user_id} assigned and user activated.`,
            ipAddress
          );

          console.log(`Successfully processed invitation acceptance for user ${userData.UserID}, assigned ClerkID: ${user_id}`);
          
          return NextResponse.json({ success: true });
        } catch (error) {
          console.error('Error processing invitation.accepted webhook:', error);
          return NextResponse.json(
            { 
              error: 'Internal Server Error',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      default:
        console.warn('Unhandled webhook event type:', eventType);
        return NextResponse.json(
          { error: 'Unhandled webhook event type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in webhook handler:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 