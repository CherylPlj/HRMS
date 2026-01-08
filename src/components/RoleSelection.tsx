'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Role {
  name: string;
}

interface UserRole {
  role: Role;
}

interface RoleSelectionProps {
  onRoleSelected: (role: string) => void;
}

export default function RoleSelection({ onRoleSelected }: RoleSelectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) {
        setError('User email not found');
        setLoading(false);
        return;
      }

      try {
        const { data: userData, error: dbError } = await supabase
          .from('User')
          .select(`
            UserRole (
              role:Role (
                name
              )
            )
          `)
          .eq('Email', user.primaryEmailAddress.emailAddress.toLowerCase().trim())
          .single();

        if (dbError) {
          console.error('Error fetching user roles:', dbError);
          setError('Failed to load roles');
          setLoading(false);
          return;
        }

        const userRoles = (userData as unknown as { UserRole?: UserRole[] })?.UserRole || [];
        const roleNames = userRoles.map((ur: UserRole) => ur.role?.name).filter(Boolean);
        
        if (roleNames.length === 0) {
          setError('No roles found for this user');
          setLoading(false);
          return;
        }

        // If user has only one role, automatically select it
        if (roleNames.length === 1) {
          await handleRoleSelect(roleNames[0]);
          return;
        }

        setRoles(roleNames);
        setLoading(false);
      } catch (err) {
        console.error('Error in fetchUserRoles:', err);
        setError('An error occurred while loading roles');
        setLoading(false);
      }
    };

    fetchUserRoles();
  }, [user]);

  const handleRoleSelect = async (roleName: string) => {
    if (selecting) return;
    
    setSelecting(true);
    setError(null);

    try {
      // Store selected role in session storage
      sessionStorage.setItem('selectedRole', roleName.toLowerCase());

      // Also update Clerk metadata if possible (optional)
      // For now, we'll rely on session storage

      // Call the callback to notify parent
      onRoleSelected(roleName.toLowerCase());
    } catch (err) {
      console.error('Error selecting role:', err);
      setError('Failed to select role. Please try again.');
      setSelecting(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
  };

  const getRoleDescription = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('admin') || roleLower.includes('super')) {
      return 'Full system access and management capabilities';
    } else if (roleLower.includes('faculty')) {
      return 'Access to faculty-specific features and information';
    } else if (roleLower.includes('cashier')) {
      return 'Access to cashier and financial features';
    } else if (roleLower.includes('registrar')) {
      return 'Access to registrar and enrollment features';
    }
    return 'Access to role-specific features';
  };

  const getRoleIcon = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('admin') || roleLower.includes('super')) {
      return 'fa-user-shield';
    } else if (roleLower.includes('faculty')) {
      return 'fa-chalkboard-teacher';
    } else if (roleLower.includes('cashier')) {
      return 'fa-cash-register';
    } else if (roleLower.includes('registrar')) {
      return 'fa-clipboard-list';
    }
    return 'fa-user';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your roles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/sign-in')}
            className="px-6 py-2 bg-[#800000] text-white rounded-lg hover:bg-red-800 transition-colors"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/sjsfilogo.png"
              alt="SJSFI Logo"
              width={64}
              height={64}
              className="w-16 h-16"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Select Your Role</h1>
          <p className="text-gray-600">
            You have multiple roles. Please select the role you want to use for this session.
          </p>
        </div>

        {/* Role Cards */}
        <div className="space-y-4 mb-6">
          {roles.map((role, index) => (
            <button
              key={index}
              onClick={() => handleRoleSelect(role)}
              disabled={selecting}
              className={`w-full p-6 rounded-lg border-2 transition-all duration-200 text-left
                ${selecting 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:border-[#800000] hover:shadow-lg cursor-pointer'
                }
                ${selecting ? 'border-gray-300' : 'border-gray-200'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-[#800000] bg-opacity-10 flex items-center justify-center">
                    <i className={`fas ${getRoleIcon(role)} text-[#800000] text-xl`}></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {getRoleDisplayName(role)}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {getRoleDescription(role)}
                    </p>
                  </div>
                </div>
                <ChevronRight className={`w-6 h-6 text-gray-400 ${selecting ? '' : 'group-hover:text-[#800000]'}`} />
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>You can switch roles later from your dashboard.</p>
        </div>
      </div>
    </div>
  );
}

