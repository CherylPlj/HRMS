'use client';

// import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs"; // Import ClerkProvider
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

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

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!isLoaded || !isSignedIn || !user) {
        setIsLoading(false);
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

        if (error) {
          console.error('Error checking authorization:', error);
          setIsAuthorized(false);
          return;
        }

        if (!userCheck || userCheck.Status !== 'Active') {
          setIsAuthorized(false);
          return;
        }

        const userRoles = (userCheck as unknown as UserCheck).UserRole;
        const role = userRoles?.[0]?.role?.name?.toLowerCase();
        const path = pathname.toLowerCase();

        // Check if user has access to the current path
        const hasAccess = Boolean(role && path.includes(`/dashboard/${role}`));
        setIsAuthorized(hasAccess);
      } catch (error) {
        console.error('Error in authorization check:', error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, [isLoaded, isSignedIn, user, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
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
