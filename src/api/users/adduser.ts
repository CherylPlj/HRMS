// import { supabase } from '@/lib/supabaseClient';
// import { ClerkExpressWithAuth } from '@clerk/express';
// const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY! });

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { firstName, lastName, email, role, status, photo } = body;

//     if (!firstName || !lastName || !email || !role || !status) {
//       return new Response(
//         JSON.stringify({ error: 'Missing required fields: firstName, lastName, email, role, or status' }),
//         { status: 400 }
//       );
//     }

//     // Step 1: Create user in Clerk
//     let clerkUser;
//     try {
//       clerkUser = await clerk.users.createUser({
//         emailAddress: [email],
//         firstName,
//         lastName,
//         publicMetadata: { role },
//       });
//     } catch (clerkError: unknown) {
//       if (clerkError instanceof Error) {
//         console.error('Error creating user in Clerk:', clerkError.message);
//         return new Response(
//           JSON.stringify({ error: 'Failed to create user in Clerk', details: clerkError.message }),
//           { status: 500 }
//         );
//       } else {
//         console.error('Unexpected Clerk error:', clerkError);
//         return new Response(
//           JSON.stringify({ error: 'Failed to create user in Clerk', details: 'Unknown error occurred' }),
//           { status: 500 }
//         );
//       }
//     }

//     // Step 2: Insert user into Supabase
//     try {
//       const res = await fetch('/api/adduser', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           firstName,
//           lastName,
//           email,
//           role,
//           status,
//           photo: photo, // <-- this should be a string URL
//         }),
//       });
      
//       if (error) {
//         console.error('Error inserting into Supabase:', error);
//         return new Response(
//           JSON.stringify({ error: 'Failed to create user in Supabase', details: error.message }),
//           { status: 500 }
//         );
//       }

//       if (!data || data.length === 0) {
//         console.error('No data returned from Supabase insert.');
//         return new Response(
//           JSON.stringify({ error: 'Failed to add user: No data returned from Supabase' }),
//           { status: 500 }
//         );
//       }

//       return new Response(
//         JSON.stringify({ message: 'User created successfully', userId: data[0].id }),
//         { status: 200 }
//       );
//     } catch (supabaseError: unknown) {
//       if (supabaseError instanceof Error) {
//         console.error('Unexpected Supabase error:', supabaseError.message);
//         return new Response(
//           JSON.stringify({ error: 'Unexpected Supabase error', details: supabaseError.message }),
//           { status: 500 }
//         );
//       } else {
//         console.error('Unknown Supabase error:', supabaseError);
//         return new Response(
//           JSON.stringify({ error: 'Unexpected Supabase error', details: 'Unknown error occurred' }),
//           { status: 500 }
//         );
//       }
//     }
//   } catch (error: unknown) {
//     if (error instanceof Error) {
//       console.error('Unexpected error:', error.message);
//       return new Response(
//         JSON.stringify({ error: 'Failed to process the request', details: error.message }),
//         { status: 500 }
//       );
//     } else {
//       console.error('Unknown error:', error);
//       return new Response(
//         JSON.stringify({ error: 'Failed to process the request', details: 'Unknown error occurred' }),
//         { status: 500 }
//       );
//     }
//   }
// }