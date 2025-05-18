import { createClient } from '@supabase/supabase-js';

// Validate Supabase URL
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

// Validate service role key
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

// Log environment check (without exposing secrets)
console.log('Supabase Admin Client Environment Check:', {
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  urlFormat: process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://'),
  keyFormat: process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate URL format
if (!supabaseUrl.startsWith('https://')) {
  throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL format. Must start with https://');
}

// Validate key format (Supabase keys start with 'eyJ')
if (!supabaseServiceRoleKey.startsWith('eyJ')) {
  throw new Error('Invalid SUPABASE_SERVICE_ROLE_KEY format. Must be a valid JWT token');
}

// Create a single supabase client for interacting with your database with admin privileges
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  }
); 