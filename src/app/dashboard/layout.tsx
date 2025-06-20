'use client';

// import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs"; // Import ClerkProvider
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

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

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { signOut } = useClerk();

  // Handle tab close or browser close
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (isSignedIn) {
        // Clear session storage
        sessionStorage.clear();
        // Clear any cached data
        localStorage.removeItem('adminActivePage');
        localStorage.removeItem('userRole');
        // Sign out from Clerk
        await signOut();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSignedIn, signOut]);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!isLoaded) return;

      if (!isSignedIn || !user) {
        setIsLoading(false);
        router.replace('/sign-in');
        return;
      }

      try {
        const { data: userCheck, error } = await supabase
          .from('User')
          .select(`
            UserID,
            Status,
            Email,
            UserRole!inner (
              role:Role (
                name
              )
            )
          `)
          .eq('Email', user.primaryEmailAddress?.emailAddress)
          .single();

        if (error || !userCheck || userCheck.Status !== 'Active') {
          setIsAuthorized(false);
          setIsLoading(false);
          router.replace('/sign-in');
          return;
        }

        const userRoles = (userCheck as unknown as UserCheck).UserRole;
        const role = userRoles?.[0]?.role?.name?.toLowerCase();
        const path = pathname.toLowerCase();

        // Check if user has access to the current path
        const hasAccess = Boolean(role && path.includes(`/dashboard/${role}`));
        
        if (!hasAccess) {
          setIsAuthorized(false);
          setIsLoading(false);
          router.replace('/sign-in');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Error in authorization check:', error);
        setIsAuthorized(false);
        router.replace('/sign-in');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, [isLoaded, isSignedIn, user, pathname, router]);

  // Show loading state until everything is checked
  if (isLoading || !isLoaded || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <ClerkProvider>
      <div className={`min-h-screen ${inter.variable} ${jetbrainsMono.variable} ${poppins.variable}`}>
        {children}
      </div>
    </ClerkProvider>
  );
}
