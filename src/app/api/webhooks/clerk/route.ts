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

        if (!email) {
          console.error('No email found in webhook data:', evt.data);
          return NextResponse.json(
            { error: 'No email found' },
            { status: 400 }
          );
        }

        try {
          // Log the user creation
          await logActivity(
            id,
            'user_created',
            'User',
            `New user created: ${first_name} ${last_name} (${email})`,
            ipAddress
          );

          // Update user status and photo in Supabase
          const { error: updateError } = await supabaseAdmin
            .from('User')
            .update({ 
              Status: 'Active',
              DateModified: new Date().toISOString(),
              LastLogin: new Date().toISOString(),
              Photo: image_url || null
            })
            .eq('UserID', id);

          if (updateError) {
            console.error('Error updating user status in Supabase:', updateError);
            return NextResponse.json(
              { error: 'Failed to update user status' },
              { status: 500 }
            );
          }

          // Log the user activation
          await logActivity(
            id,
            'user_activated',
            'User',
            `User ${first_name} ${last_name} (${email}) accepted invitation and activated their account`,
            ipAddress
          );

          // Send welcome email only if RESEND_API_KEY is configured
          if (process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            try {
              await resend.emails.send({
                from: 'HRMS <noreply@yourdomain.com>',
                to: email,
                subject: 'Welcome to HRMS - Your Account is Active',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Welcome to HRMS!</h1>
                    <p>Dear ${first_name} ${last_name},</p>
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
            console.warn('Resend API key not configured, skipping welcome email');
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
          // Update user data in Supabase
          const { error: updateError } = await supabaseAdmin
            .from('User')
            .update({ 
              DateModified: new Date().toISOString(),
              Photo: image_url || null
            })
            .eq('UserID', id);

          if (updateError) {
            console.error('Error updating user data in Supabase:', updateError);
            return NextResponse.json(
              { error: 'Failed to update user data' },
              { status: 500 }
            );
          }

          // Log the user update
          await logActivity(
            id,
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
          await logActivity(
            id,
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
            .eq('UserID', id);

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
          await logActivity(
            user_id,
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
            .eq('UserID', user_id);

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
          await logActivity(
            user_id,
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
        try {
          await logActivity(
            user_id,
            'invitation_accepted',
            'User',
            `Invitation accepted by ${email_address}`,
            ipAddress
          );
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