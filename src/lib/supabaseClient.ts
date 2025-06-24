// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with proper error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a singleton instance
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
export default supabase;

// const supabaseClient = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       // Session accessed from Clerk SDK, either as Clerk.session (vanilla
//       // JavaScript) or useSession (React)
//       accessToken: async () => session?.getToken() ?? null,
//     }
//   )

