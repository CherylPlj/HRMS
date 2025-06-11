"use client";

import { SignIn, useUser, useClerk } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Initialize Supabase client with proper error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

// Add type definitions for the database response
interface Role {
  name: string;
}

interface UserRole {
  role: {
    name: string;
  };
}

interface UserCheck {
  UserID: string;
  Status: string;
  Email: string;
  UserRole: UserRole[];
}

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleSignIn = async () => {
      try {
        if (!isSignedIn || !user) {
          console.log('User not signed in or not loaded');
          return;
        }

        const userEmail = user.primaryEmailAddress?.emailAddress;
        console.log('Attempting to verify user with email:', userEmail);

        // Verify Supabase client is initialized
        if (!supabase) {
          console.error('Supabase client is not initialized');
          setError('Database connection error. Please try again.');
          await signOut();
          return;
        }

        try {
          // First, let's check if the user exists in the database
          console.log('Checking if user exists in database...');
          const { data: userCheck, error: userError } = await supabase
            .from('User')
            .select(`
              UserID,
              Status,
              Email,
              isDeleted,
              UserRole!inner (
                role:Role (
                  name
                )
              )
            `)
            .eq('Email', userEmail)
            .single();

          console.log('Raw database response:', {
            userCheck,
            hasError: !!userError,
            errorDetails: userError ? {
              message: userError.message,
              details: userError.details,
              hint: userError.hint,
              code: userError.code
            } : null
          });

          if (userError) {
            console.error('Error checking user:', {
              error: userError,
              message: userError.message,
              details: userError.details,
              hint: userError.hint,
              code: userError.code
            });
            setError('Failed to verify user. Please try again.');
            await signOut();
            return;
          }

          if (!userCheck) {
            console.error('User not found in database:', {
              email: userEmail,
              clerkUserId: user.id
            });
            setError('User not found in the system. Please contact your administrator.');
            await signOut();
            return;
          }

          // Check if user is deleted
          if (userCheck.isDeleted) {
            console.error('Deleted user attempting to login:', {
              userId: userCheck.UserID,
              email: userCheck.Email
            });
            setError('This account has been deleted. Please contact your administrator.');
            await signOut();
            return;
          }

          // Get the role from UserRole relation
          const userRoles = (userCheck as unknown as UserCheck).UserRole;
          console.log('User roles from database:', userRoles);

          if (!userRoles || userRoles.length === 0) {
            console.error('No roles found for user:', {
              userId: userCheck.UserID,
              email: userCheck.Email
            });
            setError('User role not found. Please contact your administrator.');
            await signOut();
            return;
          }

          const role = userRoles[0]?.role?.name;
          console.log('Extracted role:', role);

          if (!role) {
            console.error('Invalid role data structure:', {
              userId: userCheck.UserID,
              email: userCheck.Email,
              userRoles
            });
            setError('User role not found. Please contact your administrator.');
            await signOut();
            return;
          }

          // Check if user role is allowed to access HRMS
          if (role.toLowerCase() === 'registrar' || role.toLowerCase() === 'cashier') {
            console.error('Unauthorized role attempting to access HRMS:', {
              userId: userCheck.UserID,
              role: role
            });
            setError('Unauthorized User.');
            await signOut();
            return;
          }

          if (userCheck.Status !== 'Active') {
            console.error('User account is not active:', {
              userId: userCheck.UserID,
              status: userCheck.Status
            });
            setError('Your account is not active. Please contact your administrator.');
            await signOut();
            return;
          }

          // Update last login timestamp using the API route
          const response = await fetch('/api/updateLastLogin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: userCheck.UserID }),
          });

          if (!response.ok) {
            console.error('Error updating last login:', await response.text());
            // Continue with the flow even if last login update fails
          } else {
            console.log('Successfully updated last login timestamp');
          }

          // Determine the redirect path based on user role
          let redirectPath = '/';
          switch (role.toLowerCase()) {
            case 'admin':
              redirectPath = '/dashboard/admin';
              break;
            case 'faculty':
              redirectPath = '/dashboard/faculty';
              break;
            case 'registrar':
              redirectPath = '/dashboard/registrar';
              break;
            case 'cashier':
              redirectPath = '/dashboard/cashier';
              break;
            default:
              console.warn('Unknown role:', role);
              redirectPath = '/';
          }

          // Check if there's a return URL in the search params
          const returnUrl = searchParams?.get('returnUrl');
          if (returnUrl) {
            // Validate the return URL to prevent open redirect vulnerabilities
            const validPaths = ['/dashboard/admin', '/dashboard/faculty', '/dashboard/registrar', '/dashboard/cashier'];
            const isValidReturnUrl = validPaths.some(path => returnUrl.startsWith(path));
            if (isValidReturnUrl) {
              redirectPath = returnUrl;
            }
          }

          console.log('Redirecting to:', redirectPath);
          router.push(redirectPath);
        } catch (queryError) {
          console.error('Error executing Supabase query:', {
            error: queryError,
            message: queryError instanceof Error ? queryError.message : 'Unknown error',
            stack: queryError instanceof Error ? queryError.stack : undefined
          });
          setError('Database query error. Please try again.');
          await signOut();
        }
      } catch (error) {
        console.error('Error in handleSignIn:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        setError(error instanceof Error ? error.message : "Failed to sign in. Please try again.");
        // Sign out the user if there's an error
        await signOut();
      }
    };

    if (isLoaded && isSignedIn && user) {
      handleSignIn();
    }
  }, [isLoaded, isSignedIn, user, router, searchParams, signOut]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-[url('/portalBG.png')] bg-cover bg-center">
      <div className="bg-white p-6 rounded-md shadow-md backdrop-blur-sm bg-opacity-80">
        <Image
          alt="logo"
          src="/sjsfilogo.png"
          width={112}
          height={112}
          className="mx-auto h-28 mb-4"
        />
        <h1 className="text-center text-xl font-bold text-[#800000] mb-4">
          SJSFI HRMS Portal Login
        </h1>
        {error && (
          <div className="mb-4 p-2 text-sm text-red-600 bg-red-50 rounded">
            {error}
          </div>
        )}
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: "bg-[#800000] hover:bg-red-800",
              formFieldInput: "border-gray-300 focus:border-[#800000] focus:ring-[#800000]",
              formFieldLabel: "text-gray-700",
              formFieldAction: "text-[#800000] hover:text-red-800",
              identityPreviewEditButton: "text-[#800000] hover:text-red-800",
              card: "bg-transparent shadow-none",
              headerTitle: "text-[#800000]",
              headerSubtitle: "text-gray-600",
              socialButtonsBlockButton: "border-gray-300 hover:bg-gray-50",
              socialButtonsBlockButtonText: "text-gray-700",
              socialButtonsBlockButtonArrow: "text-gray-700",
              dividerLine: "bg-gray-300",
              dividerText: "text-gray-600",
              formFieldWarningText: "text-red-600",
              formFieldErrorText: "text-red-600",
              footerAction: "text-gray-600",
              footerActionLink: "text-[#800000] hover:text-red-800",
            },
          }}
          afterSignInUrl="/sign-in"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
} 
