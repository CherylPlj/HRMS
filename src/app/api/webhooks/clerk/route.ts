import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { generateUserId } from '@/lib/generateUserId';
import { WebhookEvent as ClerkWebhookEvent } from '@clerk/nextjs/server';

// Initialize Resend only if API key is available
// const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const MAX_AUTO_RESEND_ATTEMPTS = 3;

// Define our custom event types
interface InvitationExpiredEvent {
  id: string;
  email_address: string;
}

interface InvitationAcceptedEvent {
  id: string;
  email_address: string;
  user_id: string;
}

interface UserDeletedEvent {
  id: string;
}

// Define the mapping between event types and their data
interface WebhookEventDataMap {
  'user.created': UserCreatedEvent;
  'user.updated': UserUpdatedEvent;
  'user.deleted': UserDeletedEvent;
  'session.created': SessionCreatedEvent;
  'session.ended': SessionEndedEvent;
  'invitation.expired': InvitationExpiredEvent;
  'invitation.accepted': InvitationAcceptedEvent;
}

// Extend the Clerk webhook event type to include our custom events
type CustomWebhookEventType = keyof WebhookEventDataMap;

interface CustomWebhookEvent extends Omit<ClerkWebhookEvent, 'type' | 'data'> {
  type: CustomWebhookEventType;
  data: WebhookEventDataMap[CustomWebhookEventType];
}

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
    // Get the headers from the request
    const svix_id = req.headers.get('svix-id');
    const svix_timestamp = req.headers.get('svix-timestamp');
    const svix_signature = req.headers.get('svix-signature');

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

    let evt: CustomWebhookEvent;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as CustomWebhookEvent;
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return NextResponse.json(
        { error: 'Error occurred during webhook verification' },
        { status: 400 }
      );
    }

    console.log('Webhook event received:', evt.type);

    const eventType = evt.type;
    const ipAddress = req.headers.get('x-forwarded-for') || 'system';

    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name } = evt.data as UserCreatedEvent;
        const email = email_addresses[0]?.email_address;

        if (!email) {
          console.error('No email address found in user.created webhook');
          return NextResponse.json(
            { error: 'No email address found' },
            { status: 400 }
          );
        }

        try {
          // Add retry mechanism for database operations
          const maxRetries = 3;
          const retryDelay = 1000; // 1 second
          let retryCount = 0;
          let userData;
          let dbError;

          while (retryCount < maxRetries) {
            // Find user by email (case insensitive)
            const { data, error } = await supabaseAdmin
              .from('User')
              .select('UserID, Status, ClerkID')
              .ilike('Email', email)
              .single();

            if (error) {
              if (error.code === 'PGRST116') { // Not found
                break; // Exit loop to create new user
              }
              console.error(`Database query attempt ${retryCount + 1} failed:`, error);
              if (retryCount < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retryCount++;
                continue;
              }
              throw error;
            }

            userData = data;
            break;
          }

          if (userData) {
            // If user already has a ClerkID, log a warning but don't fail
            if (userData.ClerkID) {
              console.warn('User already has a ClerkID:', {
                email: email,
                existingClerkId: userData.ClerkID,
                newClerkId: id
              });
            }

            // Update user with new ClerkID and ensure status is Active
            const { error: updateError } = await supabaseAdmin
              .from('User')
              .update({
                ClerkID: id,
                Status: 'Active',
                PasswordHash: 'CLERK_MANAGED', // Standardize password hash for Clerk users
                DateModified: new Date().toISOString(),
                LastLogin: new Date().toISOString()
              })
              .eq('UserID', userData.UserID);

            if (updateError) {
              console.error('Error updating user:', updateError);
              return NextResponse.json(
                { error: 'Error updating user' },
                { status: 500 }
              );
            }

            console.log('Successfully updated user with ClerkID:', id);

            // Log the activity
            await logActivity(
              userData.UserID,
              'user_created',
              'User',
              `User account created in authentication system`,
              'system'
            );
          } else {
            // Generate a new UserID for the user
            const userId = await generateUserId(new Date());

            // Create new user record
            const { error: createError } = await supabaseAdmin
              .from('User')
              .insert({
                UserID: userId,
                ClerkID: id,
                FirstName: first_name || email.split('@')[0],
                LastName: last_name || '',
                Email: email.toLowerCase(),
                Status: 'Active',
                DateCreated: new Date().toISOString(),
                LastLogin: new Date().toISOString(),
                PasswordHash: 'CLERK_MANAGED' // Standardize password hash for new Clerk users
              });

            if (createError) {
              console.error('Error creating user:', createError);
              return NextResponse.json(
                { error: 'Error creating user' },
                { status: 500 }
              );
            }

            console.log('Successfully created new user with ClerkID:', id);

            // Log the activity
            await logActivity(
              userId,
              'user_created',
              'User',
              `New user account created`,
              'system'
            );
          }

          return NextResponse.json({ success: true });
        } catch (error) {
          console.error('Error processing user.created webhook:', error);
          return NextResponse.json(
            { error: 'Internal Server Error' },
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
        const { id } = evt.data as UserDeletedEvent;
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
        const { id, email_address, user_id } = evt.data as InvitationAcceptedEvent;
        
        console.log('Processing invitation.accepted webhook:', {
          invitationId: id,
          email: email_address,
          userId: user_id
        });

        try {
          // Find user by email (case insensitive)
          const { data: userData, error: findError } = await supabaseAdmin
            .from('User')
            .select('UserID, Status, ClerkID, invitationId, PasswordHash')
            .ilike('Email', email_address)
            .single();

          if (findError) {
            console.error('Error finding user:', findError);
            return NextResponse.json(
              { error: 'Error finding user' },
              { status: 500 }
            );
          }

          if (!userData) {
            console.error('No user found for email:', email_address);
            return NextResponse.json(
              { error: 'User not found' },
              { status: 404 }
            );
          }

          // Get the Clerk user to verify their status
          const clerkUser = await clerk.users.getUser(user_id);
          const isVerified = clerkUser.emailAddresses.some(
            email => email.verification?.status === 'verified'
          );

          if (!isVerified) {
            console.log('User email not yet verified, waiting for verification');
            return NextResponse.json({ success: true });
          }

          // Only update if the user is in the correct state
          if (userData.Status !== 'Active' && userData.PasswordHash === 'CLERK_PENDING') {
            // Update user with new ClerkID, status, and standardize password hash
            const { error: updateError } = await supabaseAdmin
              .from('User')
              .update({
                ClerkID: user_id,
                Status: 'Active',
                PasswordHash: 'CLERK_MANAGED', // Standardize password hash for Clerk users
                DateModified: new Date().toISOString(),
                LastLogin: new Date().toISOString()
              })
              .eq('UserID', userData.UserID)
              .eq('PasswordHash', 'CLERK_PENDING'); // Only update if password hash is still pending

            if (updateError) {
              console.error('Error updating user:', updateError);
              return NextResponse.json(
                { error: 'Error updating user' },
                { status: 500 }
              );
            }

            console.log('Successfully updated user with ClerkID:', user_id);

            // Log the activity
            await logActivity(
              userData.UserID,
              'invitation_accepted',
              'User',
              `User accepted invitation and account was activated`,
              'system'
            );
          } else {
            console.log('User already activated or in wrong state:', {
              status: userData.Status,
              passwordHash: userData.PasswordHash
            });
          }

          // Clean up WebhookPending entry if it exists
          if (userData.invitationId) {
            const { error: cleanupError } = await supabaseAdmin
              .from('WebhookPending')
              .delete()
              .eq('invitationId', userData.invitationId);

            if (cleanupError) {
              console.error('Error cleaning up webhook pending:', cleanupError);
            }
          }

          return NextResponse.json({ success: true });
        } catch (error) {
          console.error('Error processing invitation.accepted webhook:', error);
          return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        }
      }

      default:
        console.log('Unhandled webhook event type:', eventType);
        return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Error in webhook handler:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 