import { createClient } from '@supabase/supabase-js';

// Function to validate environment variables
function validateEnv() {
  // Check for both prefixed and non-prefixed versions
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL. Please add NEXT_PUBLIC_SUPABASE_URL to your .env.local file');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing Supabase Service Role Key. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file');
  }

  if (!supabaseUrl.startsWith('https://')) {
    throw new Error('Invalid Supabase URL format. Must start with https://');
  }

  if (!supabaseServiceRoleKey.startsWith('eyJ')) {
    throw new Error('Invalid Supabase Service Role Key format. Must be a valid JWT token');
  }

  return { supabaseUrl, supabaseServiceRoleKey };
}

// Create a single supabase client for interacting with your database with admin privileges
export const supabaseAdmin = (() => {
  try {
    // Only create the client on the server side
    if (typeof window === 'undefined') {
      const { supabaseUrl, supabaseServiceRoleKey } = validateEnv();
      return createClient(supabaseUrl, supabaseServiceRoleKey);
    } else {
      // On the client side, return a dummy client that will throw an error if used
      return {
        from: () => {
          throw new Error('supabaseAdmin client cannot be used on the client side');
        }
      } as any;
    }
  } catch (error) {
    console.error('Failed to initialize Supabase admin client:', error);
    throw error;
  }
})();