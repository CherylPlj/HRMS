'use client';

import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
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
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      // Wait for both user and auth to be loaded
      if (!userLoaded || !authLoaded) {
        setIsLoading(false);
        return;
      }

      // If not signed in, redirect to sign-in
      if (!isSignedIn || !user?.primaryEmailAddress?.emailAddress) {
        router.push('/sign-in');
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
          .eq('Email', user.primaryEmailAddress.emailAddress)
          .single();

        if (error || !userCheck || userCheck.Status !== 'Active') {
          console.error('Error or inactive user:', error || 'User inactive/not found');
          router.push('/sign-in');
          return;
        }

        const userRoles = (userCheck as unknown as UserCheck).UserRole;
        const role = userRoles?.[0]?.role?.name?.toLowerCase();

        if (!role) {
          console.error('No role found for user');
          router.push('/sign-in');
          return;
        }

        setCurrentRole(role);

        // Only redirect if we're at the base dashboard path
        if (!pathname) {
          router.push('/sign-in');
          return;
        }

        // Map roles to dashboard paths
        let dashboardPath = role;
        if (role === 'super admin') {
          dashboardPath = 'admin'; // Super Admin users go to admin dashboard
        }

        if (pathname === '/dashboard' || pathname === '/dashboard/') {
          router.push(`/dashboard/${dashboardPath}`);
        }
        // If trying to access wrong role's dashboard, redirect to correct one
        else if (pathname.startsWith('/dashboard/') && !pathname.includes(`/dashboard/${dashboardPath}`)) {
          router.push(`/dashboard/${dashboardPath}`);
        }
      } catch (error) {
        console.error('Error in role check:', error);
        router.push('/sign-in');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserRole();
  }, [userLoaded, authLoaded, isSignedIn, user, pathname, router]);

  // Show loading state while checking authentication and role
  if (isLoading || !userLoaded || !authLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  // If not authenticated, don't render anything (middleware will handle redirect)
  if (!isSignedIn) {
    return null;
  }

  return (
    <div className={`min-h-screen ${inter.variable} ${jetbrainsMono.variable} ${poppins.variable}`}>
      {children}
    </div>
  );
}
