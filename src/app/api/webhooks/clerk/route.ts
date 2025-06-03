import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  // Get the headers
  const headersList = await headers();
  const svix_id = headersList.get('svix-id');
  const svix_timestamp = headersList.get('svix-timestamp');
  const svix_signature = headersList.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
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
    return new Response('Error occured', {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      return new Response('No email found', { status: 400 });
    }

    // Update user status to Active in Supabase
    const { error } = await supabase
      .from('User')
      .update({ Status: 'Active' })
      .eq('Email', email);

    if (error) {
      console.error('Error updating user status:', error);
      return new Response('Error updating user status', { status: 500 });
    }

    // Log the activity
    await supabase.from('ActivityLog').insert({
      UserID: id,
      ActionType: 'User Status Update',
      EntityAffected: 'User',
      ActionDetails: `User ${first_name} ${last_name} completed registration and status updated to Active`,
      IPAddress: req.headers.get('x-forwarded-for') || 'Unknown'
    });
  }

  return new Response('Webhook processed successfully', { status: 200 });
} 