'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { ChevronDown, Check } from 'lucide-react';
import { getUserRoles, setSelectedRole, getSelectedRole, getDashboardPath } from '@/lib/userRoles';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RoleSwitcherProps {
  className?: string;
}

export default function RoleSwitcher({ className = '' }: RoleSwitcherProps) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [roles, setRoles] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoles = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) {
        setLoading(false);
        return;
      }

      try {
        const userRoles = await getUserRoles(undefined, user.primaryEmailAddress.emailAddress);
        
        if (userRoles.length <= 1) {
          // User has only one role, don't show switcher
          setLoading(false);
          return;
        }

        setRoles(userRoles);
        
        // Get current selected role or default to first
        const selected = getSelectedRole();
        if (selected && userRoles.includes(selected)) {
          setCurrentRole(selected);
        } else {
          setCurrentRole(userRoles[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading roles:', error);
        setLoading(false);
      }
    };

    loadRoles();
  }, [user]);

  const handleRoleChange = async (newRole: string) => {
    if (newRole === currentRole) {
      setIsOpen(false);
      return;
    }

    try {
      // Call API to verify and save the role selection
      const response = await fetch('/api/user/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to switch role' }));
        console.error('Error switching role:', errorData.error);
        alert(`Failed to switch role: ${errorData.error || 'Unknown error'}`);
        return;
      }

      // Update selected role in session storage
      setSelectedRole(newRole);
      setCurrentRole(newRole);

      // Redirect to appropriate dashboard for the new role
      const dashboardPath = getDashboardPath(newRole);
      
      // Force a full page reload to ensure all components pick up the new role
      if (pathname?.startsWith('/dashboard')) {
        window.location.href = dashboardPath;
      } else {
        router.push(dashboardPath);
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Error changing role:', error);
      alert('Failed to switch role. Please try again.');
    }
  };

  const getRoleDisplayName = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
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

  if (loading || roles.length <= 1) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 md:space-x-2 px-3 md:px-4 py-1.5 md:py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm"
        title="Switch Role"
      >
        <i className={`fas ${getRoleIcon(currentRole)} text-[#800000]`}></i>
        <span className="font-medium text-gray-700 hidden xs:inline">
          {getRoleDisplayName(currentRole)}
        </span>
        <span className="font-medium text-gray-700 xs:hidden">
          Role
        </span>
        <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 md:w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
            <div className="px-3 py-2 text-[10px] md:text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
              Switch Role
            </div>
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`w-full flex items-center justify-between px-3 md:px-4 py-2 text-sm hover:bg-gray-50 transition-colors
                  ${currentRole === role ? 'bg-red-50' : ''}
                `}
              >
                <div className="flex items-center space-x-2 md:space-x-3">
                  <i className={`fas ${getRoleIcon(role)} text-[#800000] w-4`}></i>
                  <span className={`text-xs md:text-sm ${currentRole === role ? 'font-semibold text-[#800000]' : 'text-gray-700'}`}>
                    {getRoleDisplayName(role)}
                  </span>
                </div>
                {currentRole === role && (
                  <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#800000]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}



