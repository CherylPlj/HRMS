'use client';

import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!isLoaded || !user?.primaryEmailAddress?.emailAddress) {
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
        if (pathname === '/dashboard' || pathname === '/dashboard/') {
          router.push(`/dashboard/${role}`);
        }
        // If trying to access wrong role's dashboard, redirect to correct one
        else if (pathname.startsWith('/dashboard/') && !pathname.includes(`/dashboard/${role}`)) {
          router.push(`/dashboard/${role}`);
        }
      } catch (error) {
        console.error('Error in role check:', error);
        router.push('/sign-in');
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && !currentRole) {
      checkUserRole();
    }
  }, [isLoaded, user, pathname, router, currentRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${inter.variable} ${jetbrainsMono.variable} ${poppins.variable}`}>
      {children}
    </div>
  );
}
